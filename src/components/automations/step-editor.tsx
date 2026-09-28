"use client";

import * as React from "react";
import { useTransition } from "react";
import { Trash2, Mail, Clock, Tag as TagIcon, TagsIcon } from "lucide-react";
import { addStepAction, removeStepAction, updateStepConfigAction } from "@/lib/actions/automation-actions";
import { Input } from "@/components/auth/form-elements";
import { Select } from "@/components/auth/select";
import { Button } from "@/components/ui/button";
import type { automationSteps } from "@/db/schema";

type Step = typeof automationSteps.$inferSelect;

const stepMeta = {
  SEND_EMAIL: { label: "Send email", icon: Mail },
  WAIT: { label: "Wait", icon: Clock },
  ADD_TAG: { label: "Add tag", icon: TagIcon },
  REMOVE_TAG: { label: "Remove tag", icon: TagsIcon },
} as const;

function useFieldSave(automationId: string, stepId: string) {
  const [, startTransition] = useTransition();
  return (field: string, value: string) => {
    const fd = new FormData();
    fd.set("automationId", automationId);
    fd.set("stepId", stepId);
    fd.set("field", field);
    fd.set("value", value);
    startTransition(() => updateStepConfigAction(fd));
  };
}

function StepFields({
  automationId,
  step,
  templates,
}: {
  automationId: string;
  step: Step;
  templates: { id: string; name: string }[];
}) {
  const save = useFieldSave(automationId, step.id);
  const config = step.config as Record<string, string | number>;

  if (step.type === "SEND_EMAIL") {
    return (
      <Select defaultValue={String(config.templateId ?? "")} onChange={(e) => save("templateId", e.target.value)}>
        <option value="" disabled>
          Choose a template…
        </option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
    );
  }
  if (step.type === "WAIT") {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          defaultValue={Number(config.minutes ?? 60)}
          onBlur={(e) => save("minutes", e.target.value)}
          className="w-28"
        />
        <span className="text-[12.5px] text-text-secondary">minutes</span>
      </div>
    );
  }
  return (
    <Input
      defaultValue={String(config.tagName ?? "")}
      onBlur={(e) => save("tagName", e.target.value)}
      placeholder="Tag name"
    />
  );
}

export function StepEditor({
  automationId,
  steps,
  templates,
}: {
  automationId: string;
  steps: Step[];
  templates: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {steps.map((step, index) => {
          const meta = stepMeta[step.type];
          const Icon = meta.icon;
          return (
            <div key={step.id} className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[11px] font-semibold text-text-tertiary">
                {index + 1}
              </span>
              <div className="flex-1 space-y-2">
                <span className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">
                  <Icon size={13} />
                  {meta.label}
                </span>
                <StepFields automationId={automationId} step={step} templates={templates} />
              </div>
              <form action={removeStepAction}>
                <input type="hidden" name="automationId" value={automationId} />
                <input type="hidden" name="stepId" value={step.id} />
                <button
                  type="submit"
                  className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-danger-surface hover:text-danger"
                  aria-label="Remove step"
                >
                  <Trash2 size={12} />
                </button>
              </form>
            </div>
          );
        })}
        {steps.length === 0 && (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border p-6 text-center text-[13px] text-text-tertiary">
            Add a step below to build your workflow.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
        {(Object.keys(stepMeta) as (keyof typeof stepMeta)[]).map((type) => {
          const meta = stepMeta[type];
          const Icon = meta.icon;
          return (
            <form key={type} action={addStepAction}>
              <input type="hidden" name="automationId" value={automationId} />
              <input type="hidden" name="stepType" value={type} />
              <Button type="submit" variant="secondary" size="sm">
                <Icon size={13} />
                {meta.label}
              </Button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
