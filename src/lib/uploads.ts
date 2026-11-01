import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { emailTemplates, landingPages, uploadedImages } from "@/db/schema";
import { getCampaignById } from "@/lib/campaigns";
import { appUrl } from "@/lib/app-url";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Vercel functions accept request bodies up to 4.5 MB, so images stored in the database stay under this. */
export const MAX_DIRECT_IMAGE_BYTES = 4 * 1024 * 1024;
/** Total database-stored images per workspace. */
export const MAX_WORKSPACE_IMAGE_BYTES = 100 * 1024 * 1024;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export const uploadScopeSchema = z
  .object({
    campaignId: z.string().uuid().optional(),
    templateId: z.string().uuid().optional(),
    landingId: z.string().uuid().optional(),
  })
  .refine((v) => [v.campaignId, v.templateId, v.landingId].filter(Boolean).length === 1, "Provide a campaign, a template or a landing page.");

export type UploadScope = z.infer<typeof uploadScopeSchema>;

export class UploadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Confirms the target belongs to the workspace and returns its storage path segment, e.g. "campaigns/{id}". */
export async function resolveUploadScope(workspaceId: string, scope: UploadScope): Promise<string> {
  if (scope.campaignId) {
    const campaign = await getCampaignById(workspaceId, scope.campaignId);
    if (!campaign || campaign.status !== "DRAFT") throw new UploadError("Images can only be added to a draft campaign in this workspace.", 404);
    return `campaigns/${campaign.id}`;
  }
  if (scope.landingId) {
    const [page] = await db.select({ id: landingPages.id }).from(landingPages).where(and(eq(landingPages.id, scope.landingId), eq(landingPages.workspaceId, workspaceId))).limit(1);
    if (!page) throw new UploadError("Images can only be added to a landing page in this workspace.", 404);
    return `landing-pages/${page.id}`;
  }
  const [template] = await db.select({ id: emailTemplates.id }).from(emailTemplates).where(and(eq(emailTemplates.id, scope.templateId!), eq(emailTemplates.workspaceId, workspaceId))).limit(1);
  if (!template) throw new UploadError("Images can only be added to a template in this workspace.", 404);
  return `templates/${template.id}`;
}

export function s3Configured() {
  return Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET && process.env.S3_REGION);
}

/** Identifies the real image type from the file's first bytes, never from the name or the declared type. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return "image/gif";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export function storedImageUrl(id: string) {
  return appUrl(`/api/uploads/images/${id}`);
}

export async function storeImage(workspaceId: string, bytes: Buffer): Promise<string> {
  if (bytes.length === 0) throw new UploadError("That file is empty.", 400);
  if (bytes.length > MAX_DIRECT_IMAGE_BYTES) throw new UploadError("Choose an image smaller than 4 MB.", 413);
  const type = sniffImageType(bytes);
  if (!type) throw new UploadError("Choose a JPG, PNG, WebP, or GIF image.", 400);

  const [{ used }] = await db.select({ used: sql<number>`coalesce(sum(${uploadedImages.size}), 0)::int` }).from(uploadedImages).where(eq(uploadedImages.workspaceId, workspaceId));
  if (used + bytes.length > MAX_WORKSPACE_IMAGE_BYTES) throw new UploadError("Your image storage is full. Remove unused images or upgrade your plan.", 413);

  const [row] = await db.insert(uploadedImages).values({ workspaceId, contentType: type, size: bytes.length, data: bytes }).returning({ id: uploadedImages.id });
  return storedImageUrl(row.id);
}
