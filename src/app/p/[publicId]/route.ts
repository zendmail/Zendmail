import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { signupForms, workspaces } from "@/db/schema";
import { getPublicLanding, renderLandingHtml } from "@/lib/landing-pages";
import { parseTheme } from "@/lib/email-builder/theme";

const unavailable = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not available</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#F6F7F9;color:#10151C;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px"><div><h1 style="font-size:20px;margin:0 0 6px">This page is not available</h1><p style="margin:0;color:#5B6573;font-size:14px">It may have been unpublished or removed by its owner.</p></div></body></html>`;

const headers = { "Content-Type": "text/html; charset=utf-8" };

export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const page = await getPublicLanding(publicId);
  if (!page || page.status !== "PUBLISHED") return new Response(unavailable, { status: 404, headers });

  const [workspace] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, page.workspaceId)).limit(1);
  const [form] = page.formId
    ? await db.select({ publicId: signupForms.publicId, collectName: signupForms.collectName, status: signupForms.status }).from(signupForms).where(eq(signupForms.id, page.formId)).limit(1)
    : [];

  const html = renderLandingHtml({
    blocks: page.blocks,
    theme: parseTheme(page.theme),
    title: page.seoTitle || page.name,
    description: page.seoDescription || undefined,
    pageId: page.publicId,
    form: form && form.status === "ACTIVE" ? form : null,
    businessName: workspace?.name ?? "",
  });
  return new Response(html, { headers: { ...headers, "Cache-Control": "public, max-age=0, s-maxage=30" } });
}
