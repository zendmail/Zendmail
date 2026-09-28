import { Card } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { DollarSign, Mail, MousePointerClick, Send, Users } from "lucide-react";

/**
 * Every value here is a real, current count from the database — there
 * are no trend arrows or "+X% vs last period" deltas, because this
 * workspace doesn't yet store historical snapshots to compare against.
 * Showing a fabricated percentage change would be worse than showing
 * none; add real period-over-period comparison once snapshots exist.
 */
export function KpiGrid({
  contactTotal,
  sentCampaignCount,
  openRate,
  clickRate,
  hasSentEmail,
  revenue,
  currency,
}: {
  contactTotal: number;
  sentCampaignCount: number;
  openRate: number;
  clickRate: number;
  hasSentEmail: boolean;
  revenue: number | null;
  currency: string;
}) {
  const kpis = [
    { label: "Contacts", value: formatNumber(contactTotal), caption: "In this workspace", icon: Users, tone: "text-primary bg-primary-surface" },
    { label: "Campaigns sent", value: formatNumber(sentCampaignCount), caption: "All time", icon: Send, tone: "text-success bg-success-surface" },
    {
      label: "Open rate",
      value: hasSentEmail ? formatPercent(openRate) : "—",
      caption: hasSentEmail ? "Across sent campaigns" : "Send a campaign to start tracking",
      icon: Mail,
      tone: "text-accent bg-purple-50",
    },
    {
      label: "Click rate",
      value: hasSentEmail ? formatPercent(clickRate) : "—",
      caption: hasSentEmail ? "Across sent campaigns" : "Send a campaign to start tracking",
      icon: MousePointerClick,
      tone: "text-warning bg-warning-surface",
    },
    {
      label: "Revenue",
      value: revenue === null ? "--" : formatCurrency(revenue, currency),
      caption: revenue === null ? "No completed sales in workspace currency" : "Paid sales in workspace currency",
      icon: DollarSign,
      tone: "text-emerald-700 bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi, index) => (
        <Card
          key={kpi.label}
          className="dashboard-card dashboard-reveal min-w-0 p-4"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium text-text-secondary">{kpi.label}</p>
            <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${kpi.tone}`}>
              <kpi.icon size={15} strokeWidth={2.2} />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-[26px] font-bold leading-tight text-text-primary">{kpi.value}</span>
          </div>
          <p className="mt-1 text-[12px] leading-[1.4] text-text-secondary">{kpi.caption}</p>
        </Card>
      ))}
    </div>
  );
}
