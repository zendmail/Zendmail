import Link from "next/link";
import { DollarSign, Eye, MousePointer2, Send, ArrowUpRight, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

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
    { label: "Contacts", value: formatNumber(contactTotal), caption: "All time", icon: UserRound, tone: "bg-[#DCEAFF] text-[#0B5FFF]", href: "/contacts" },
    { label: "Campaigns sent", value: formatNumber(sentCampaignCount), caption: "All time", icon: Send, tone: "bg-[#D8EEFF] text-[#0B7BE0]", href: "/campaigns" },
    {
      label: "Open rate",
      value: hasSentEmail ? formatPercent(openRate) : "—",
      caption: hasSentEmail ? "Across sent campaigns" : "No data yet",
      icon: Eye,
      tone: "bg-[#D3F6F3] text-[#0B8F86]",
    },
    {
      label: "Click rate",
      value: hasSentEmail ? formatPercent(clickRate) : "—",
      caption: hasSentEmail ? "Across sent campaigns" : "No data yet",
      icon: MousePointer2,
      tone: "bg-[#F0E4FF] text-[#8B3DF0]",
    },
    {
      label: "Revenue",
      value: revenue === null ? "—" : formatCurrency(revenue, currency),
      caption: revenue === null ? "No data yet" : "Paid sales",
      icon: DollarSign,
      tone: "bg-[#D1F4E6] text-[#0E9F7A]",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi, index) => (
        <Card
          key={kpi.label}
          className={`dashboard-card dashboard-reveal min-w-0 p-4 ${index === kpis.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <div className="flex items-center gap-2.5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${kpi.tone}`}>
              <kpi.icon size={18} strokeWidth={2} />
            </span>
            <p className="min-w-0 text-[12.5px] font-bold leading-tight text-text-primary">{kpi.label}</p>
          </div>
          <p className="mt-3 truncate text-[26px] font-extrabold leading-tight text-text-primary">{kpi.value}</p>
          <div className="mt-1 flex items-center justify-between gap-2 text-[12px] text-text-secondary">
            <span>{kpi.caption}</span>
            {kpi.href && (
              <Link href={kpi.href} aria-label={`View ${kpi.label.toLowerCase()}`} className="text-text-secondary hover:text-primary">
                <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
