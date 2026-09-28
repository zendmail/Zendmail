import { randomUUID } from "node:crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getCampaignById } from "@/lib/campaigns";
import { rateLimit } from "@/lib/rate-limit";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const uploadSchema = z.object({
  campaignId: z.string().uuid(),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  fileSize: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

const extensionByType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to upload an image." }, { status: 401 });

  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) return Response.json({ error: "Choose a workspace before uploading." }, { status: 403 });

  const limit = await rateLimit("campaign-image-upload", 30, 60 * 60);
  if (!limit.allowed) return Response.json({ error: limit.message }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Choose a valid image file." }, { status: 400 });
  }

  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Choose a JPG, PNG, WebP, or GIF image under 10 MB." }, { status: 400 });
  }

  const campaign = await getCampaignById(workspace.id, parsed.data.campaignId);
  if (!campaign || campaign.status !== "DRAFT") {
    return Response.json({ error: "Images can only be added to a draft campaign in this workspace." }, { status: 404 });
  }

  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  if (!accessKeyId || !secretAccessKey || !bucket || !region) {
    return Response.json({ error: "Image uploads are not configured yet. Ask your workspace admin to configure storage." }, { status: 503 });
  }

  const extension = extensionByType[parsed.data.contentType];
  const key = `workspaces/${workspace.id}/campaigns/${campaign.id}/images/${randomUUID()}.${extension}`;
  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Expires: 300,
      Fields: {
        "Content-Type": parsed.data.contentType,
        success_action_status: "204",
      },
      Conditions: [
        ["content-length-range", 1, MAX_IMAGE_BYTES + 64 * 1024],
        ["eq", "$key", key],
        ["eq", "$Content-Type", parsed.data.contentType],
        ["eq", "$success_action_status", "204"],
      ],
    });

    const publicBaseUrl = (process.env.S3_PUBLIC_BASE_URL || `https://${bucket}.s3.${region}.amazonaws.com`).replace(/\/+$/, "");
    return Response.json({
      uploadUrl: url,
      fields,
      imageUrl: `${publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`,
    });
  } catch {
    return Response.json({ error: "Could not prepare the upload. Please try again." }, { status: 500 });
  }
}