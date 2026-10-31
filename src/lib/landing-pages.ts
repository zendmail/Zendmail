import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { landingPages } from "@/db/schema";
import type { EmailBlock, EmailTheme } from "@/db/schema";
import { appUrl } from "@/lib/app-url";
import { createDefaultBlock } from "@/lib/email-blocks";
import { renderEmailHtml } from "@/lib/email-builder/render";

export const MAX_LANDING_PAGES = 20;

export const landingSettingsSchema = z.object({
  name: z.string().trim().min(2, "Give the page a name.").max(80),
  seoTitle: z.string().trim().max(70, "Keep the page title under 70 characters.").default(""),
  seoDescription: z.string().trim().max(160, "Keep the description under 160 characters.").default(""),
  formId: z.string().uuid().nullable(),
});

export function newLandingPublicId() {
  return randomBytes(9).toString("base64url");
}

export function landingPublicUrl(publicId: string) {
  return appUrl(`/p/${publicId}`);
}

export async function getPublicLanding(publicId: string) {
  if (!/^[A-Za-z0-9_-]{8,24}$/.test(publicId)) return null;
  const [page] = await db.select().from(landingPages).where(eq(landingPages.publicId, publicId)).limit(1);
  return page ?? null;
}

/** A sensible first draft, so a new page is never blank: headline, benefits, proof and a call to action. */
export function starterBlocks(businessName: string): EmailBlock[] {
  const hero = createDefaultBlock("hero");
  if (hero.type === "hero") {
    hero.eyebrow = "";
    hero.headline = `Welcome to ${businessName}`;
    hero.text = "Tell visitors what you offer and why they should care, in one or two short sentences.";
    hero.buttonLabel = "Get started";
    hero.buttonUrl = "#signup";
  }
  const list = createDefaultBlock("list");
  const quote = createDefaultBlock("testimonials");
  return [hero, list, quote];
}

/** Footer blocks carry an email unsubscribe link, which makes no sense on a web page, so they are dropped. */
export function webBlocks(blocks: EmailBlock[]): EmailBlock[] {
  return blocks.filter((b) => b.type !== "footer");
}

/** Height of the embedded signup form, which depends on whether it asks for a name. */
export function signupFrameHeight(collectName: boolean) {
  return collectName ? 430 : 360;
}

export function renderLandingHtml(input: {
  blocks: EmailBlock[];
  theme: EmailTheme | null;
  title: string;
  description?: string;
  form?: { publicId: string; collectName: boolean } | null;
  /** This landing page's own public id, passed to the form so signups are credited to the page. */
  pageId?: string;
  businessName: string;
}) {
  const below = input.form
    ? `<div id="signup" style="padding:8px 24px 28px;"><iframe src="${appUrl(`/f/${input.form.publicId}`)}?embed=1${input.pageId ? `&amp;ref=${input.pageId}` : ""}" title="Subscribe" width="100%" height="${signupFrameHeight(input.form.collectName)}" style="border:0;display:block;max-width:480px;margin:0 auto;" loading="lazy"></iframe></div>`
    : "";
  return renderEmailHtml(webBlocks(input.blocks), {
    theme: input.theme,
    vars: { business_name: input.businessName, unsubscribe_url: "#" },
    page: { title: input.title, description: input.description, below },
  });
}
