type Scope = "campaign" | "template" | "landing";

const DIRECT_LIMIT = 4 * 1024 * 1024;
const scopeKey = (scope: Scope) => (scope === "template" ? "templateId" : scope === "landing" ? "landingId" : "campaignId");

/** Scales a large photo down (max 2000 px, JPEG/WebP) so it fits the upload limit; small files and GIFs are left untouched. */
async function shrinkImage(file: File): Promise<File> {
  if (file.size <= DIRECT_LIMIT * 0.85 || file.type === "image/gif" || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#FFFFFF"; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Uploads an image for a campaign, template or landing page and returns its public URL. With object storage configured the
 * browser posts straight to S3 (presigned); otherwise the file is stored by Zendmail itself. Throws a user-readable Error.
 */
export async function uploadCampaignImage(targetId: string, file: File, scope: Scope = "campaign"): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose an image smaller than 10 MB.");

  const signatureResponse = await fetch("/api/uploads/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [scopeKey(scope)]: targetId, contentType: file.type, fileSize: file.size }),
  });
  const info = (await signatureResponse.json()) as { error?: string; direct?: boolean; uploadUrl?: string; fields?: Record<string, string>; imageUrl?: string };
  if (!signatureResponse.ok) throw new Error(info.error || "Could not prepare the upload.");

  if (info.direct) {
    const small = await shrinkImage(file);
    if (small.size > DIRECT_LIMIT) throw new Error("Choose an image smaller than 4 MB.");
    const body = new FormData();
    body.append(scopeKey(scope), targetId);
    body.append("file", small);
    const response = await fetch("/api/uploads/images/direct", { method: "POST", body });
    const result = (await response.json()) as { error?: string; imageUrl?: string };
    if (!response.ok || !result.imageUrl) throw new Error(result.error || "Image upload failed. Please try again.");
    return result.imageUrl;
  }

  if (!info.uploadUrl || !info.fields || !info.imageUrl) throw new Error(info.error || "Could not prepare the upload.");
  const formData = new FormData();
  Object.entries(info.fields).forEach(([name, value]) => formData.append(name, value));
  formData.append("file", file);
  const uploadResponse = await fetch(info.uploadUrl, { method: "POST", body: formData });
  if (!uploadResponse.ok) throw new Error("Image upload failed. Please try again.");
  return info.imageUrl;
}
