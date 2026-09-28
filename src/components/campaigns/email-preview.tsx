import { renderBlocksToHtml } from "@/lib/email-blocks";
import type { EmailBlock } from "@/db/schema";

export function EmailPreview({ blocks }: { blocks: EmailBlock[] }) {
  const html = renderBlocksToHtml(blocks);
  return (
    <iframe
      title="Email preview"
      srcDoc={html}
      sandbox=""
      className="h-[600px] w-full rounded-[var(--radius-md)] border border-border bg-white"
    />
  );
}
