import Link from "next/link";
import { ArrowRight, ChevronRight, Plus, Tag, UserRoundPlus, Waypoints } from "lucide-react";
import { Card } from "@/components/ui/card";
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
const triggerIcon = { CONTACT_CREATED: UserRoundPlus, TAG_ADDED: Tag } as const;

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
    <Card className="dashboard-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Waypoints size={24} className="mt-0.5 text-primary" strokeWidth={2} />
          <div>
            <h2 className="text-[17px] font-bold leading-tight text-text-primary">Automations</h2>
            <p className="mt-1 text-[12.5px] text-text-secondary">
              {activeCount} active workflow{activeCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Link href="/automations" className="inline-flex items-center gap-1 pt-0.5 text-[12.5px] font-semibold text-primary hover:underline">
          View all <ArrowRight size={13} />
        </Link>
      </div>

      {automations.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-1.5 border-t border-border pt-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success-surface text-success"><Waypoints size={19} /></span>
          <p className="mt-1 text-[14px] font-bold text-text-primary">No automations yet</p>
          <p className="text-[12.5px] text-text-secondary">Create your first workflow.</p>
        </div>
      ) : (
        <ul className="mt-3 border-t border-border">
          {automations.map((automation) => {
            const Icon = triggerIcon[automation.triggerType as keyof typeof triggerIcon] ?? Waypoints;
            const contacts = automation.activeRuns + automation.completedRuns;
            return (
              <li key={automation.id} className="border-b border-border last:border-0">
                <Link href={`/automations/${automation.id}`} className="group flex items-center gap-3 py-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success-surface text-success">
                    <Icon size={19} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-text-primary">{automation.name}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[12px] text-text-secondary">
                      {contacts.toLocaleString("en-US")} contact{contacts === 1 ? "" : "s"} <span aria-hidden="true">•</span>
                      <Badge tone={statusTone[automation.status]} className="px-2 py-0.5 text-[11px]">
                        {automation.status.charAt(0) + automation.status.slice(1).toLowerCase()}
                      </Badge>
                    </span>
                  </span>
                  <ChevronRight size={17} className="shrink-0 text-text-secondary group-hover:text-primary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {recentActivity.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-[12px] font-semibold text-text-secondary">Recent activity</p>
          <ul className="space-y-1.5">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="flex items-start justify-between gap-3 text-[12px]">
                <Link href={`/automations/${activity.workflowId}`} className="min-w-0 truncate text-text-primary hover:underline">
                  {activity.type === "run_completed" ? "Run completed" : activity.type === "run_failed" ? "Run failed" : "Step completed"} · {activity.workflowName}
                </Link>
                <time className="shrink-0 text-text-tertiary" dateTime={activity.createdAt.toISOString()}>
                  {activity.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </time>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/automations/new"
        className="mt-3 flex h-11 items-center justify-center gap-2 rounded-[10px] border border-primary/15 bg-primary-surface text-[13.5px] font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        <Plus size={16} strokeWidth={2.4} /> Create automation
      </Link>
    </Card>
  );
}
