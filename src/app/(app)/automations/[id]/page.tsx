import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trash2, Zap, Pause, Play } from "lucide-react";
import { isNull } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StepEditor } from "@/components/automations/step-editor";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getAutomationWithSteps } from "@/lib/automations";
import { activateAutomationAction, pauseAutomationAction, deleteAutomationAction } from "@/lib/actions/automation-actions";
import { db } from "@/db/client";
import { emailTemplates } from "@/db/schema";

const statusTone = { DRAFT: "neutral", ACTIVE: "success", PAUSED: "warning" } as const;

export default async function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const automation = await getAutomationWithSteps(workspace.id, id);
  if (!automation) notFound();

  const templates = await db
    .select({ id: emailTemplates.id, name: emailTemplates.name })
    .from(emailTemplates)
    .where(isNull(emailTemplates.workspaceId));

  return (
    <div className="mx-auto max-w-[800px] space-y-5">
      <Link
        href="/automations"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to automations
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-text-primary">{automation.name}</h1>
          <Badge tone={statusTone[automation.status]}>
            {automation.status.charAt(0) + automation.status.slice(1).toLowerCase()}
          </Badge>
        </div>
        <div className="flex gap-2">
          {automation.status === "ACTIVE" ? (
            <form action={pauseAutomationAction}>
              <input type="hidden" name="automationId" value={automation.id} />
              <Button type="submit" variant="secondary" size="sm">
                <Pause size={14} />
                Pause
              </Button>
            </form>
          ) : (
            <form action={activateAutomationAction}>
              <input type="hidden" name="automationId" value={automation.id} />
              <Button type="submit" size="sm" disabled={automation.steps.length === 0}>
                <Play size={14} />
                Activate
              </Button>
            </form>
          )}
          <form action={deleteAutomationAction}>
            <input type="hidden" name="id" value={automation.id} />
            <button
              type="submit"
              className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border px-3 text-[13px] font-medium text-danger hover:bg-danger-surface"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </form>
        </div>
      </div>

      <Card className="flex items-center gap-3 p-4">
        <Zap size={18} className="text-primary" />
        <p className="text-[13.5px] text-text-primary">
          Triggers when{" "}
          {automation.triggerType === "TAG_ADDED" ? (
            <>
              a contact is tagged <strong>&quot;{automation.triggerConfig.tagName}&quot;</strong>
            </>
          ) : (
            "a new contact is created"
          )}
        </p>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Workflow steps</CardTitle>
            <CardDescription>
              Steps run in order, top to bottom, for each contact that triggers this automation.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <StepEditor automationId={automation.id} steps={automation.steps} templates={templates} />
        </CardContent>
      </Card>

      {automation.status === "DRAFT" && automation.steps.length === 0 && (
        <p className="text-center text-[12.5px] text-text-tertiary">
          Add at least one step before activating this automation.
        </p>
      )}
    </div>
  );
}
