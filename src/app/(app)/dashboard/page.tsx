import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { CampaignPerformance } from "@/components/dashboard/campaign-performance";
import { RecentCampaigns } from "@/components/dashboard/recent-campaigns";
import { AiInsights } from "@/components/dashboard/ai-insights";
import { AutomationPerformance } from "@/components/dashboard/side-panels";
import { LaunchPad } from "@/components/dashboard/launch-pad";
import { HeroIllustration } from "@/components/dashboard/dashboard-illustrations";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getDashboardData } from "@/lib/dashboard";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const data = await getDashboardData(workspace.id, workspace.currency);

  return (
    <div className="dashboard-reveal mx-auto max-w-[1400px] space-y-4">
      <div className="dashboard-hero flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="dashboard-hero-copy">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">Workspace overview</p>
          <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-text-primary">
            Good morning, {workspace.name}
          </h1>
          <p className="mt-1.5 text-[14px] font-normal leading-[1.5] text-text-secondary">
            Here&apos;s what&apos;s happening with your marketing.
          </p>
        </div>
        <form action={createDraftCampaignAction} className="relative z-20 sm:mr-1">
          <Button type="submit" className="h-10 rounded-[8px] px-4 text-[13px] font-semibold">
            <Plus size={16} /> Create campaign
          </Button>
        </form>
        <HeroIllustration />
      </div>

      <LaunchPad />

      <KpiGrid
        contactTotal={data.contactCounts.total}
        sentCampaignCount={data.sentCampaignCount}
        openRate={data.emailOverview.openRate}
        clickRate={data.emailOverview.clickRate}
        hasSentEmail={data.emailOverview.sent > 0}
        revenue={data.revenue}
        currency={workspace.currency}
      />

      <div className="dashboard-reveal grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(290px,1fr)]" style={{ animationDelay: "120ms" }}>
        <div className="min-w-0 space-y-4">
          <CampaignPerformance data={data.campaignPerformance} />
          <RecentCampaigns campaigns={data.recentCampaigns} />
        </div>
        <div className="space-y-4">
          <AiInsights insights={data.insights} hasContacts={data.contactCounts.total > 0} />
          <AutomationPerformance
            automations={data.automationSummary}
            activeCount={data.activeAutomationCount}
            recentActivity={data.recentAutomationActivity}
          />
        </div>
      </div>
    </div>
  );
}
