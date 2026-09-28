import Link from "next/link";
import { Workflow } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { automations as automationsTable } from "@/db/schema";

type AutomationSummary = (typeof automationsTable.$inferSelect) & {
  stepCount: number;
  activeRuns: number;
  completedRuns: number;
};

type AutomationActivity = {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowStatus: "DRAFT" | "ACTIVE" | "PAUSED";
  type: string;
  createdAt: Date;
};

const statusTone = { DRAFT: "neutral", ACTIVE: "success", PAUSED: "warning" } as const;

export function AutomationPerformance({
  automations,
  activeCount,
  recentActivity,
}: {
  automations: AutomationSummary[];
  activeCount: number;
  recentActivity: AutomationActivity[];
}) {
  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div>
          <CardTitle>Automations</CardTitle>
          <CardDescription>Workflow status and recent activity</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-4 px-5 pb-5 pt-3">
        {automations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-5 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-success-surface text-success"><Workflow size={17} /></span>
            <p className="text-[14px] font-semibold text-text-primary">No automations yet</p>
            <p className="text-[13px] text-text-secondary">Create your first workflow.</p>
            <Link href="/automations/new" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
              Create automation <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-text-secondary">Active workflows</p>
                <span className="text-[13px] font-semibold text-text-primary">{activeCount}</span>
              </div>
              <div className="space-y-3">
                {automations.map((automation) => (
                  <Link key={automation.id} href={`/automations/${automation.id}`} className="block">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate font-medium text-text-primary">{automation.name}</span>
                      <Badge tone={statusTone[automation.status]}>{automation.status.charAt(0) + automation.status.slice(1).toLowerCase()}</Badge>
                    </div>
                    <p className="mt-1 text-[12px] text-text-secondary">
                      {automation.activeRuns} active · {automation.completedRuns} completed
                    </p>
                  </Link>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-[12px] font-semibold text-text-secondary">Recent automation activity</p>
              {recentActivity.length === 0 ? (
                <p className="text-[12px] leading-[1.5] text-text-secondary">Activity appears here when a contact enters a workflow.</p>
              ) : (
                <ul className="space-y-2">
                  {recentActivity.map((activity) => (
                    <li key={activity.id} className="flex items-start justify-between gap-3 text-[12px]">
                      <Link href={`/automations/${activity.workflowId}`} className="min-w-0 truncate text-text-primary hover:underline">
                        {activity.type === "run_completed" ? "Run completed" : activity.type === "run_failed" ? "Run failed" : "Step completed"} · {activity.workflowName}
                      </Link>
                      <time className="shrink-0 text-text-tertiary" dateTime={activity.createdAt.toISOString()}>
                        {activity.createdAt.toLocaleDateString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
