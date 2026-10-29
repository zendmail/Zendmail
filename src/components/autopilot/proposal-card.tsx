import { CircleAlert } from "lucide-react";
import type { autopilotProposals } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProposalPreview } from "@/components/autopilot/proposal-preview";
import { approveAutopilotProposalAction, dismissAutopilotProposalAction } from "@/lib/actions/autopilot-actions";
import type { AudienceSpec } from "@/lib/autopilot/playbook";
import { renderEmailHtml } from "@/lib/email-builder/render";
import { TEMPLATE_LIBRARY } from "@/lib/template-library";

export function ProposalCard({ proposal: p }: { proposal: typeof autopilotProposals.$inferSelect }) {
  const audience = p.audience as unknown as AudienceSpec;
  const html = renderEmailHtml(p.blocks, { theme: p.theme, preheader: p.previewText });
  const template = TEMPLATE_LIBRARY.find((t) => t.key === p.templateKey);
  return (
              <li className="grid gap-5 rounded-[18px] border border-border bg-surface p-5 shadow-[var(--shadow-xs)] lg:grid-cols-[320px_1fr]">
                <ProposalPreview html={html} title={p.title} />
                <div className="flex min-w-0 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[17px] font-bold tracking-[-0.01em] text-text-primary">{p.title}</h3>
                    <Badge tone="primary">{p.kind === "WELCOME_FLOW" ? "Automatic flow" : "Campaign"}</Badge>
                    {p.copySource === "AI" && <Badge tone="success">AI-written copy</Badge>}
                  </div>
                  <p className="mt-1 text-[13.5px] text-text-secondary">{p.goal}</p>
                  <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
                    <div className="sm:col-span-2"><dt className="font-semibold text-text-primary">Why Autopilot chose this</dt><dd className="mt-0.5 text-text-secondary">{p.why}</dd></div>
                    <div><dt className="font-semibold text-text-primary">Who gets it</dt><dd className="mt-0.5 text-text-secondary">{audience.label}</dd></div>
                    <div><dt className="font-semibold text-text-primary">When</dt><dd className="mt-0.5 text-text-secondary">{p.timing}</dd></div>
                    <div className="sm:col-span-2"><dt className="font-semibold text-text-primary">Subject line</dt><dd className="mt-0.5 text-text-secondary">{p.subject}{template ? <span className="text-text-tertiary"> · design: {template.name}</span> : null}</dd></div>
                  </dl>
                  {p.warnings.length > 0 && (
                    <div className="mt-4 rounded-[10px] bg-warning-surface px-3.5 py-3 text-[12.5px] text-warning">
                      <p className="mb-1 flex items-center gap-1.5 font-semibold"><CircleAlert size={14} /> Check before sending</p>
                      <ul className="list-disc space-y-0.5 pl-5">{p.warnings.map((w) => (<li key={w}>{w}</li>))}</ul>
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    <form action={approveAutopilotProposalAction}>
                      <input type="hidden" name="proposalId" value={p.id} />
                      <Button type="submit">{p.kind === "WELCOME_FLOW" ? "Set up this flow" : "Approve and open in editor"}</Button>
                    </form>
                    <form action={dismissAutopilotProposalAction}>
                      <input type="hidden" name="proposalId" value={p.id} />
                      <Button type="submit" variant="ghost">Not now</Button>
                    </form>
                  </div>
                </div>
              </li>
  );
}
