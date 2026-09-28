"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus, X, Users, Loader2 } from "lucide-react";
import {
  createSegmentAction,
  previewSegmentAction,
  type SegmentActionState,
} from "@/lib/actions/segment-actions";
import { fieldConfig, needsValueInput, type SegmentField, type SegmentOperator } from "@/lib/segment-fields";
import { Field, Input, ErrorBanner } from "@/components/auth/form-elements";
import { Select } from "@/components/auth/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

type Rule = { field: SegmentField; operator: SegmentOperator; value: string };

const fieldOrder = Object.keys(fieldConfig) as SegmentField[];

function defaultRule(): Rule {
  const field = "STATUS" as SegmentField;
  return { field, operator: fieldConfig[field].operators[0].value, value: "CUSTOMER" };
}

export function SegmentBuilder() {
  const [matchType, setMatchType] = React.useState<"ALL" | "ANY">("ALL");
  const [rules, setRules] = React.useState<Rule[]>([defaultRule()]);
  const [preview, setPreview] = React.useState<{ count?: number; error?: string; loading: boolean }>({
    loading: false,
  });
  const [state, formAction, pending] = useActionState<SegmentActionState, FormData>(
    createSegmentAction,
    undefined
  );

  function updateRule(index: number, patch: Partial<Rule>) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setPreview({ loading: false });
  }

  function addRule() {
    setRules((prev) => [...prev, defaultRule()]);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
    setPreview({ loading: false });
  }

  function buildFormData() {
    const fd = new FormData();
    fd.set("matchType", matchType);
    rules.forEach((r) => {
      fd.append("rule_field", r.field);
      fd.append("rule_operator", r.operator);
      fd.append("rule_value", r.value);
    });
    return fd;
  }

  async function handlePreview() {
    setPreview({ loading: true });
    const result = await previewSegmentAction(buildFormData());
    setPreview({ ...result, loading: false });
  }

  return (
    <form action={formAction} className="space-y-5">
      <ErrorBanner message={state?.error} />
      <input type="hidden" name="matchType" value={matchType} />

      <Field label="Segment name" htmlFor="name">
        <Input id="name" name="name" placeholder="High-value repeat customers" required />
      </Field>
      <Field label="Description (optional)" htmlFor="description">
        <Input id="description" name="description" placeholder="What is this segment used for?" />
      </Field>

      <div className="rounded-[var(--radius-md)] border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-text-primary">Match</p>
          <div className="flex items-center rounded-[var(--radius-sm)] border border-border p-0.5">
            {(["ALL", "ANY"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setMatchType(opt)}
                className={`rounded-[6px] px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                  matchType === opt ? "bg-primary text-primary-text-on" : "text-text-secondary"
                }`}
              >
                {opt === "ALL" ? "ALL conditions (AND)" : "ANY condition (OR)"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {rules.map((rule, index) => {
            const config = fieldConfig[rule.field];
            return (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] bg-surface-secondary/50 p-2.5">
                <input type="hidden" name="rule_field" value={rule.field} />
                <input type="hidden" name="rule_operator" value={rule.operator} />
                <input type="hidden" name="rule_value" value={rule.value} />

                <Select
                  value={rule.field}
                  onChange={(e) => {
                    const field = e.target.value as SegmentField;
                    const op = fieldConfig[field].operators[0].value;
                    updateRule(index, { field, operator: op, value: "" });
                  }}
                  className="w-44"
                >
                  {fieldOrder.map((f) => (
                    <option key={f} value={f}>
                      {fieldConfig[f].label}
                    </option>
                  ))}
                </Select>

                <Select
                  value={rule.operator}
                  onChange={(e) => updateRule(index, { operator: e.target.value as SegmentOperator })}
                  className="w-56"
                >
                  {config.operators.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </Select>

                {needsValueInput(rule.operator) &&
                  (config.inputType === "select" ? (
                    <Select
                      value={rule.value}
                      onChange={(e) => updateRule(index, { value: e.target.value })}
                      className="w-40"
                    >
                      <option value="" disabled>
                        Select…
                      </option>
                      {config.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={config.inputType === "number" || config.inputType === "days" ? "number" : "text"}
                      value={rule.value}
                      onChange={(e) => updateRule(index, { value: e.target.value })}
                      placeholder={
                        config.inputType === "days" ? "e.g. 60" : config.inputType === "number" ? "e.g. 200" : "Value"
                      }
                      className="w-32"
                    />
                  ))}

                {rules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-text-tertiary hover:bg-surface hover:text-danger"
                    aria-label="Remove condition"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addRule}
          className="flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
        >
          <Plus size={14} />
          Add condition
        </button>
      </div>

      <Card className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2.5">
          <Users size={16} className="text-text-tertiary" />
          <div>
            {preview.loading ? (
              <p className="flex items-center gap-1.5 text-[13.5px] text-text-secondary">
                <Loader2 size={13} className="animate-spin" /> Calculating…
              </p>
            ) : preview.count !== undefined ? (
              <p className="text-[13.5px] font-medium text-text-primary">
                {formatNumber(preview.count)} contact{preview.count === 1 ? "" : "s"} match
              </p>
            ) : (
              <p className="text-[13.5px] text-text-secondary">Preview how many contacts match</p>
            )}
            {preview.error && <p className="text-[12.5px] text-danger mt-0.5">{preview.error}</p>}
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={handlePreview}>
          Preview audience
        </Button>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save segment"}
      </Button>
    </form>
  );
}
