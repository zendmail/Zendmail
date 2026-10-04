import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CheckResult, PreSendReport } from "@/lib/sending/presend-rules";

const TONE = { PASS: "success", WARN: "warning", FAIL: "danger", UNKNOWN: "neutral", "N/A": "neutral" } as const;
const LABEL = { PASS: "✓ Pass", WARN: "⚠ Warning", FAIL: "✕ Blocked", UNKNOWN: "Unknown", "N/A": "N/A" } as const;

function Item({ check }: { check: CheckResult }) {
  return (
    <li className="space-y-1 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-text-primary">{check.label}</p>
        <Badge tone={TONE[check.status]} className="shrink-0">
          {check.status === "FAIL" && !check.blocking ? "✕ Failing" : LABEL[check.status]}
        </Badge>
      </div>
      <p className="text-[12.5px] text-text-secondary">{check.detail}</p>
      {check.status !== "PASS" && check.resolution ? <p className="text-[12.5px] text-text-primary">Fix: {check.resolution}</p> : null}
    </li>
  );
}

export function PreSendChecklist({ report }: { report: PreSendReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pre-send check</CardTitle>
        <CardDescription>
          {report.canSend ? "No blocking problems found." : `${report.blockers.length} problem${report.blockers.length === 1 ? "" : "s"} must be fixed before this can send.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {[...report.checks]
            .sort((a, b) => Number(b.status === "FAIL") - Number(a.status === "FAIL"))
            .map((c) => (
              <Item key={c.key} check={c} />
            ))}
        </ul>
      </CardContent>
    </Card>
  );
}
