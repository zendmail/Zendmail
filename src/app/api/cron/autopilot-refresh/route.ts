import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { autopilotProposals, plans, subscriptions, workspaces } from "@/db/schema";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { generateProposalsForWorkspace } from "@/lib/autopilot/generate";
import { recordAuditLog } from "@/lib/audit";

// Weekly refresh for workspaces that already use Autopilot: prepares fresh, reviewable drafts so there is always something
// current waiting. It never sends anything. Schedule it daily or weekly; a workspace is refreshed at most once every 6 days.
const BATCH = 10;

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000);
    // Workspaces that have used Autopilot (any proposal ever) ...
    const used = await db.selectDistinct({ id: autopilotProposals.workspaceId }).from(autopilotProposals);
    const usedIds = used.map((u) => u.id);
    if (usedIds.length === 0) return NextResponse.json({ ok: true, refreshed: 0 });

    // ... minus those refreshed recently.
    const fresh = await db.selectDistinct({ id: autopilotProposals.workspaceId }).from(autopilotProposals).where(and(inArray(autopilotProposals.workspaceId, usedIds), gte(autopilotProposals.createdAt, sixDaysAgo)));
    const freshIds = new Set(fresh.map((f) => f.id));
    const dueIds = usedIds.filter((id) => !freshIds.has(id)).slice(0, BATCH);
    if (dueIds.length === 0) return NextResponse.json({ ok: true, refreshed: 0 });

    const rows = await db
      .select({ workspace: workspaces, planName: plans.name })
      .from(workspaces)
      .leftJoin(subscriptions, eq(subscriptions.workspaceId, workspaces.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(inArray(workspaces.id, dueIds), sql`${workspaces.deletedAt} is null`, eq(workspaces.onboardingStep, "COMPLETE")))
      .orderBy(desc(workspaces.createdAt));

    let refreshed = 0;
    for (const { workspace, planName } of rows) {
      try {
        const result = await generateProposalsForWorkspace({ id: workspace.id, name: workspace.name, logoUrl: workspace.logoUrl, website: workspace.website, currency: workspace.currency, planName: planName ?? "Free" });
        await recordAuditLog({ action: "autopilot.plan_refreshed", workspaceId: workspace.id, metadata: result });
        refreshed += 1;
      } catch (err) {
        console.error("autopilot refresh failed for a workspace:", err);
      }
    }
    return NextResponse.json({ ok: true, refreshed });
  } catch (err) {
    console.error("autopilot-refresh cron failed:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
