"use client";

import * as React from "react";
import { useActionState } from "react";
import { Sparkles, Send, Wand2 } from "lucide-react";
import {
  generateEmailAction,
  transformEmailAction,
  createCampaignFromGeneratedAction,
  type AiStudioState,
} from "@/lib/actions/ai-actions";
import { renderBlocksToHtml } from "@/lib/email-blocks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/auth/select";
import { ErrorBanner } from "@/components/auth/form-elements";

const quickPrompts = [
  "Create a promotional email for my online toy store offering 20% off",
  "Write a welcome email for new subscribers introducing our brand",
  "Write a win-back email for customers who haven't purchased in 60 days",
];

const transformButtons: { key: string; label: string }[] = [
  { key: "regenerate", label: "Regenerate" },
  { key: "improve", label: "Improve" },
  { key: "shorten", label: "Shorten" },
  { key: "expand", label: "Expand" },
  { key: "professional", label: "Make professional" },
  { key: "friendly", label: "Make friendly" },
];

export function AiStudio() {
  const [state, formAction, pending] = useActionState<AiStudioState, FormData>(generateEmailAction, undefined);
  const [transformState, transformAction, transformPending] = useActionState<AiStudioState, FormData>(
    transformEmailAction,
    undefined
  );
  const [language, setLanguage] = React.useState("Spanish");

  const current = transformState?.email ?? state?.email;
  const instruction = transformState?.instruction ?? state?.instruction ?? "";
  const error = transformState?.error ?? state?.error;
  const busy = pending || transformPending;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Describe the email you want
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-3">
              <ErrorBanner message={!current ? error : undefined} />
              <textarea
                name="instruction"
                defaultValue={instruction}
                rows={4}
                placeholder="e.g. Create a promotional email for my online toy store offering 20% off"
                className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[13.5px] text-text-primary outline-none focus:border-primary"
                required
              />
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={(e) => {
                      const form = e.currentTarget.closest("form");
                      const textarea = form?.querySelector("textarea");
                      if (textarea) textarea.value = p;
                    }}
                    className="rounded-full border border-border px-2.5 py-1 text-[11.5px] text-text-secondary hover:bg-surface-secondary"
                  >
                    {p.length > 40 ? p.slice(0, 40) + "…" : p}
                  </button>
                ))}
              </div>
              <Button type="submit" disabled={busy}>
                <Wand2 size={15} />
                {pending ? "Generating…" : "Generate"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {current && (
          <Card>
            <CardHeader>
              <CardTitle>Refine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ErrorBanner message={current ? error : undefined} />
              <div className="flex flex-wrap gap-1.5">
                {transformButtons.map((t) => (
                  <form key={t.key} action={transformAction}>
                    <input type="hidden" name="currentEmail" value={JSON.stringify(current)} />
                    <input type="hidden" name="transform" value={t.key} />
                    <input type="hidden" name="instruction" value={instruction} />
                    <Button type="submit" variant="secondary" size="sm" disabled={busy}>
                      {t.label}
                    </Button>
                  </form>
                ))}
              </div>
              <form action={transformAction} className="flex items-center gap-2">
                <input type="hidden" name="currentEmail" value={JSON.stringify(current)} />
                <input type="hidden" name="transform" value="translate" />
                <input type="hidden" name="instruction" value={instruction} />
                <Select name="targetLanguage" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-40">
                  {["Spanish", "French", "German", "Portuguese", "Japanese"].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="secondary" size="sm" disabled={busy}>
                  Translate
                </Button>
              </form>

              <form action={createCampaignFromGeneratedAction} className="border-t border-border pt-3">
                <input type="hidden" name="currentEmail" value={JSON.stringify(current)} />
                <Button type="submit" className="w-full" disabled={busy}>
                  <Send size={15} />
                  Create campaign from this
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2 lg:sticky lg:top-20 lg:self-start">
        <p className="text-[13px] font-medium text-text-secondary">Preview</p>
        {current ? (
          <>
            <div className="rounded-[var(--radius-md)] border border-border bg-surface p-3">
              <p className="text-[12px] text-text-tertiary">Subject</p>
              <p className="text-[13.5px] font-medium text-text-primary">{current.subject}</p>
              <p className="mt-2 text-[12px] text-text-tertiary">Preview text</p>
              <p className="text-[13px] text-text-secondary">{current.previewText}</p>
            </div>
            <iframe
              title="AI email preview"
              srcDoc={renderBlocksToHtml(current.blocks)}
              sandbox=""
              className="h-[480px] w-full rounded-[var(--radius-md)] border border-border bg-white"
            />
          </>
        ) : (
          <div className="flex h-[400px] items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border text-center text-[13px] text-text-tertiary">
            Your generated email will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
