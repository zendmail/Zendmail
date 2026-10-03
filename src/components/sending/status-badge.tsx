import { Badge } from "@/components/ui/badge";
import type { CheckStatus } from "@/lib/sending/rules";

const MAP: Record<CheckStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  PASSING: { label: "✓ Passing", tone: "success" },
  PENDING: { label: "Pending", tone: "warning" },
  FAILING: { label: "✕ Failing", tone: "danger" },
  NOT_CHECKED: { label: "Not checked", tone: "neutral" },
};

export function AuthStatusBadge({ status }: { status: CheckStatus }) {
  const { label, tone } = MAP[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/** DMARC is a recommendation, so a missing record reads "Recommended", never "failing". */
export function DmarcBadge({ status, policy }: { status: CheckStatus; policy: string | null }) {
  if (status === "NOT_CHECKED") return <Badge>Not checked</Badge>;
  if (status === "PASSING") return <Badge tone={policy === "none" ? "warning" : "success"}>{policy === "none" ? "Present · monitoring only" : `✓ ${policy ?? "Present"}`}</Badge>;
  return <Badge tone="warning">⚠ Recommended</Badge>;
}
