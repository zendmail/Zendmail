import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_DIRECT_IMAGE_BYTES, resolveUploadScope, storeImage, UploadError, uploadScopeSchema } from "@/lib/uploads";

/** Stores an image in the database when no object storage is configured. Same checks as the S3 route. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to upload an image." }, { status: 401 });
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) return Response.json({ error: "Choose a workspace before uploading." }, { status: 403 });

  const limit = await rateLimit("image-upload-direct", 30, 60 * 60);
  if (!limit.allowed) return Response.json({ error: limit.message }, { status: 429 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Choose a valid image file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a valid image file." }, { status: 400 });
  if (file.size > MAX_DIRECT_IMAGE_BYTES) return Response.json({ error: "Choose an image smaller than 4 MB." }, { status: 413 });

  const scope = uploadScopeSchema.safeParse({
    campaignId: form.get("campaignId") || undefined,
    templateId: form.get("templateId") || undefined,
    landingId: form.get("landingId") || undefined,
  });
  if (!scope.success) return Response.json({ error: "Choose a valid image file." }, { status: 400 });

  try {
    await resolveUploadScope(workspace.id, scope.data);
    const imageUrl = await storeImage(workspace.id, Buffer.from(await file.arrayBuffer()));
    return Response.json({ imageUrl });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Image upload failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Could not save the image. Please try again." }, { status: 500 });
  }
}
