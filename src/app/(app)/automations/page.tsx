import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Workflow, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { listAutomations } from "@/lib/automations";
import { processDueRunsAction } from "@/lib/actions/automation-actions";
import { formatNumber } from "@/lib/utils";

const statusTone = { DRAFT: "neutral", ACTIVE: "success", PAUSED: "warning" } as const;

export default async function AutomationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const automations = await listAutomations(workspace.id);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Automations</h1>
          <p className="mt-1 text-[13.5px] text-text-secondary">
            Trigger-based workflows that run automatically as contacts interact with your business.
          </p>
        </div>
        <div className="flex gap-2">
          <form action={processDueRunsAction}>
            <Button type="submit" variant="secondary" title="In production this runs on a background worker">
              <RefreshCw size={15} />
              Process due steps
            </Button>
          </form>
          <Link href="/automations/new">
            <Button>
              <Plus size={15} />
              Create automation
            </Button>
          </Link>
        </div>
      </div>

      {automations.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <Workflow size={28} className="text-text-tertiary" />
          <p className="text-[14px] font-medium text-text-primary">No automations yet</p>
          <p className="max-w-sm text-[13px] text-text-secondary">
            Build a workflow that runs automatically — for example, tag a contact &quot;VIP&quot; and automatically send them a
            welcome email.
          </p>
          <Link href="/automations/new" className="mt-2">
            <Button size="sm">Create your first automation</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {automations.map((a) => (
            <Link key={a.id} href={`/automations/${a.id}`}>
              <Card className="h-full p-5 hover:border-border-strong transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-semibold text-text-primary">{a.name}</p>
                  <Badge tone={statusTone[a.status]}>{a.status.charAt(0) + a.status.slice(1).toLowerCase()}</Badge>
                </div>
                <p className="mt-1 text-[12.5px] text-text-tertiary">
                  {a.triggerType === "TAG_ADDED" ? `Tag added: "${a.triggerConfig.tagName}"` : "Contact created"}
                </p>
                <div className="mt-4 flex items-center justify-between text-[12.5px] text-text-secondary">
                  <span>{a.stepCount} step{a.stepCount === 1 ? "" : "s"}</span>
                  <span>{formatNumber(a.activeRuns)} in progress</span>
                  <span>{formatNumber(a.completedRuns)} completed</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
