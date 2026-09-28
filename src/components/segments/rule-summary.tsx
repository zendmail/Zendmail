import * as React from "react";
import { fieldConfig, type SegmentField, type SegmentOperator } from "@/lib/segment-fields";

export function RuleSummary({
  rules,
  matchType,
}: {
  rules: { field: string; operator: string; value: string | null }[];
  matchType: "ALL" | "ANY";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {rules.map((rule, idx) => {
        const config = fieldConfig[rule.field as SegmentField];
        const opLabel =
          config?.operators.find((o) => o.value === (rule.operator as SegmentOperator))?.label ?? rule.operator;
        const valueLabel =
          config?.inputType === "select"
            ? config.options?.find((o) => o.value === rule.value)?.label ?? rule.value
            : config?.inputType === "days"
              ? `${rule.value} days`
              : rule.value;

        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                {matchType === "ALL" ? "and" : "or"}
              </span>
            )}
            <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-[12.5px] text-text-primary">
              {config?.label ?? rule.field} {opLabel} {valueLabel ? <strong>{valueLabel}</strong> : null}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
