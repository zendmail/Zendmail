import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getWorkspaceEmailOverview, listCampaignPerformance } from "@/lib/analytics";
import { formatNumber, formatPercent } from "@/lib/utils";

export default async function AnalyticsOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [overview, campaigns] = await Promise.all([
    getWorkspaceEmailOverview(workspace.id),
    listCampaignPerformance(workspace.id),
  ]);

  const kpis = [
    { label: "Campaigns sent", value: formatNumber(overview.campaignsSent) },
    { label: "Emails sent", value: formatNumber(overview.sent) },
    { label: "Open rate", value: formatPercent(overview.openRate) },
    { label: "Click rate", value: formatPercent(overview.clickRate) },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Analytics</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          Real send, open, and click data from your sent campaigns.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-[13px] text-text-secondary">{kpi.label}</p>
            <p className="mt-2 text-[26px] font-semibold tracking-tight text-text-primary">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {overview.sent === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-[14px] font-medium text-text-primary">No data yet</p>
          <p className="max-w-sm text-[13px] text-text-secondary">
            Send your first campaign to start seeing open rates, click rates, and performance here.
          </p>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="mb-4 text-[13.5px] font-medium text-text-primary">Most recent campaigns</p>
          <div className="space-y-3">
            {campaigns.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-[13.5px] font-medium text-text-primary">{c.name}</p>
                  <p className="text-[12px] text-text-tertiary">
                    {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "—"} · {formatNumber(c.delivered)} delivered
                  </p>
                </div>
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">{formatPercent(c.openRate)}</p>
                    <p className="text-[11px] text-text-tertiary">opens</p>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">{formatPercent(c.clickRate)}</p>
                    <p className="text-[11px] text-text-tertiary">clicks</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
