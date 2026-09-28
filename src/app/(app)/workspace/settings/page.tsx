import { redirect } from "next/navigation";
import { Gauge, HeartHandshake } from "lucide-react";
import { and, eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WorkspaceSettingsForm } from "@/components/workspace/workspace-settings-form";
import { FrequencyGuardForm } from "@/components/workspace/frequency-guard-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { db } from "@/db/client";
import { workspaces, contacts } from "@/db/schema";
import { formatNumber } from "@/lib/utils";

export default async function WorkspaceSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const activeWorkspace = await getActiveWorkspaceForUser(user.id);
  if (!activeWorkspace) redirect("/onboarding/create");

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, activeWorkspace.id)).limit(1);

  const [{ count: pausedCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, activeWorkspace.id), sql`${contacts.pausedUntil} > now()`));

  const [{ count: reducedCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, activeWorkspace.id), sql`${contacts.maxEmailsPerWeek} is not null`));

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Settings</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Business details and sending protections.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business information</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkspaceSettingsForm
            workspace={{
              name: workspace.name,
              website: workspace.website,
              industry: workspace.industry,
              country: workspace.country,
              currency: workspace.currency,
              timezone: workspace.timezone,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge size={16} className="text-primary" />
              Send Frequency Guard
            </CardTitle>
            <CardDescription>
              Caps how many marketing emails any one contact receives, counted across every campaign combined —
              not just per-campaign. Prevents accidental inbox fatigue when several campaigns overlap in the same
              week.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <FrequencyGuardForm currentValue={workspace.maxEmailsPerContactPerWeek} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake size={16} className="text-primary" />
              Smart Unsubscribe
            </CardTitle>
            <CardDescription>
              When someone clicks unsubscribe, they&apos;re offered &quot;send me less&quot; or &quot;pause 30
              days&quot; before a full opt-out — keeping more subscribers on your list.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[var(--radius-md)] bg-surface-secondary/60 p-4">
              <p className="text-[12px] text-text-secondary">Currently paused</p>
              <p className="mt-1 text-[20px] font-semibold text-text-primary">{formatNumber(pausedCount)}</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-surface-secondary/60 p-4">
              <p className="text-[12px] text-text-secondary">On reduced frequency</p>
              <p className="mt-1 text-[20px] font-semibold text-text-primary">{formatNumber(reducedCount)}</p>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-text-tertiary">
            These are contacts who chose an alternative to unsubscribing entirely — subscribers you&apos;d have lost
            with a plain unsubscribe link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
