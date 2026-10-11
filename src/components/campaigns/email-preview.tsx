import type { EmailBlock, EmailTheme } from "@/db/schema";
import { renderBlocksToHtml } from "@/lib/email-blocks";
import { SAMPLE_VARS } from "@/lib/email-builder/merge";
import { EmailPreviewFrame } from "@/components/campaigns/email-preview-frame";

export function EmailPreview({ blocks, theme, previewText, businessName }: { blocks: EmailBlock[]; theme?: EmailTheme | null; previewText?: string | null; businessName?: string }) {
  const html = renderBlocksToHtml(blocks, null, { theme, preheader: previewText, vars: { ...SAMPLE_VARS, business_name: businessName ?? SAMPLE_VARS.business_name } });
  return <EmailPreviewFrame html={html} />;
}
