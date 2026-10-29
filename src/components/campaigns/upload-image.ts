/** Uploads an image for a draft campaign (presigned S3 POST) and returns its public URL. Throws a user-readable Error. */
export async function uploadCampaignImage(campaignId: string, file: File, scope: "campaign" | "template" = "campaign"): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose an image smaller than 10 MB.");

  const signatureResponse = await fetch("/api/uploads/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [scope === "template" ? "templateId" : "campaignId"]: campaignId, contentType: file.type, fileSize: file.size }),
  });
  const info = (await signatureResponse.json()) as { error?: string; uploadUrl?: string; fields?: Record<string, string>; imageUrl?: string };
  if (!signatureResponse.ok || !info.uploadUrl || !info.fields || !info.imageUrl) throw new Error(info.error || "Could not prepare the upload.");

  const formData = new FormData();
  Object.entries(info.fields).forEach(([name, value]) => formData.append(name, value));
  formData.append("file", file);
  const uploadResponse = await fetch(info.uploadUrl, { method: "POST", body: formData });
  if (!uploadResponse.ok) throw new Error("Image upload failed. Please try again.");
  return info.imageUrl;
}
