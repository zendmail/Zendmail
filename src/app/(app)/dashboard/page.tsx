import { redirect } from "next/navigation";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { CampaignPerformance } from "@/components/dashboard/campaign-performance";
import { RecentCampaigns } from "@/components/dashboard/recent-campaigns";
import { AiInsights } from "@/components/dashboard/ai-insights";
import { AutomationPerformance } from "@/components/dashboard/side-panels";
import { LaunchPad } from "@/components/dashboard/launch-pad";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { CtaCard } from "@/components/dashboard/cta-card";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getDashboardData, parsePerformanceRange } from "@/lib/dashboard";
import { formatCurrency, formatPercent, formatPersonName } from "@/lib/utils";

/** "Good morning" / "Good afternoon" / "Good evening" in the workspace's own timezone. */
function greetingFor(timezone: string) {
  let hour: number;
  try {
    hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(new Date())) % 24;
  } catch {
    hour = new Date().getHours();
  }
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const { range: rangeParam } = await searchParams;
  const range = parsePerformanceRange(rangeParam);
  const data = await getDashboardData(workspace.id, workspace.currency, range);

  const displayName = formatPersonName(user.name);
  const firstName = displayName.split(/\s+/)[0] || displayName;
  const hasSentEmail = data.emailOverview.sent > 0;

  return (
    <div className="mx-auto grid max-w-[1560px] grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_316px]">
      <div className="min-w-0 space-y-5">
        <WelcomeHero
          greeting={greetingFor(workspace.timezone)}
          firstName={firstName}
          contactTotal={data.contactCounts.total}
          sentThisMonth={data.sentThisMonthCount}
          openRate={hasSentEmail ? formatPercent(data.emailOverview.openRate) : null}
          revenue={data.revenue === null ? null : formatCurrency(data.revenue, workspace.currency)}
        />

        <LaunchPad />

        <KpiGrid
          contactTotal={data.contactCounts.total}
          sentCampaignCount={data.sentCampaignCount}
          openRate={data.emailOverview.openRate}
          clickRate={data.emailOverview.clickRate}
          hasSentEmail={hasSentEmail}
          revenue={data.revenue}
          currency={workspace.currency}
        />

        <CampaignPerformance
          data={data.campaignPerformance}
          range={data.performanceRange}
          hasSentCampaigns={data.hasSentCampaigns}
        />

        <RecentCampaigns campaigns={data.recentCampaigns} />
      </div>

      <aside className="space-y-4">
        <AiInsights insights={data.insights} hasContacts={data.contactCounts.total > 0} />
        <AutomationPerformance
          automations={data.automationSummary}
          activeCount={data.activeAutomationCount}
          recentActivity={data.recentAutomationActivity}
        />
        <CtaCard />
      </aside>
    </div>
  );
}
