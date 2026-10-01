import { Card } from "@/components/ui/card";
import { getPlatformOverview, listRecentAuditLogs } from "@/lib/admin/queries";
import { formatNumber } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const [overview, recentLogs] = await Promise.all([getPlatformOverview(), listRecentAuditLogs(10)]);

  const kpis = [
    { label: "Total users", value: overview.totalUsers },
    { label: "Total workspaces", value: overview.totalWorkspaces },
    { label: "Total contacts", value: overview.totalContacts },
    { label: "Emails sent (all time)", value: overview.totalEmailsSent },
    { label: "Suspended accounts", value: overview.suspendedUsers },
  ];

  return (
    <div className="max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Platform overview</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">System health, growth, and recent activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <p className="text-[12px] text-text-secondary">{kpi.label}</p>
            <p className="mt-1 text-[22px] font-semibold text-text-primary">{formatNumber(kpi.value)}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-3 text-[13.5px] font-medium text-text-primary">Subscriptions by plan</p>
          <div className="space-y-2">
            {overview.planBreakdown.length === 0 && (
              <p className="text-[13px] text-text-tertiary">No active subscriptions yet.</p>
            )}
            {overview.planBreakdown.map((p) => (
              <div key={p.planName} className="flex items-center justify-between text-[13px]">
                <span className="text-text-secondary">{p.planName}</span>
                <span className="font-medium text-text-primary">{formatNumber(p.count)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-3 text-[13.5px] font-medium text-text-primary">Recent activity</p>
          <div className="space-y-2.5">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-[12.5px]">
                <span className="text-text-secondary">{log.action}</span>
                <span className="text-text-tertiary">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {recentLogs.length === 0 && <p className="text-[13px] text-text-tertiary">No activity yet.</p>}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-[13.5px] font-medium text-text-primary">System health</p>
        <div className="mt-2 flex items-center gap-2 text-[13px] text-success">
          <span className="h-2 w-2 rounded-full bg-success" />
          Database connection healthy
        </div>
      </Card>
    </div>
  );
}
