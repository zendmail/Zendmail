import type { LucideIcon } from "lucide-react";
import { DollarSign, Eye, Plus, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroArt } from "@/components/dashboard/dashboard-illustrations";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";

type HeroStat = {
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  tone: string;
};

export function WelcomeHero({
  greeting,
  firstName,
  contactTotal,
  sentThisMonth,
  openRate,
  revenue,
}: {
  greeting: string;
  firstName: string;
  contactTotal: number;
  sentThisMonth: number;
  /** Already formatted (e.g. "42.8%") or null when no email has been sent yet. */
  openRate: string | null;
  /** Already formatted currency, or null when there are no completed sales. */
  revenue: string | null;
}) {
  const stats: HeroStat[] = [
    { label: "Contacts", value: contactTotal.toLocaleString("en-US"), caption: "Total contacts", icon: UserRound, tone: "bg-white text-primary ring-1 ring-[#D6E4F8]" },
    { label: "Campaigns sent", value: sentThisMonth.toLocaleString("en-US"), caption: "This month", icon: Send, tone: "bg-white text-primary ring-1 ring-[#D6E4F8]" },
    { label: "Open rate", value: openRate ?? "—", caption: openRate ? "Across sent campaigns" : "No data yet", icon: Eye, tone: "bg-[#CFF5F3] text-[#0B8F86]" },
    { label: "Revenue", value: revenue ?? "—", caption: revenue ? "Paid sales" : "No data yet", icon: DollarSign, tone: "bg-[#CDF3E5] text-[#0E9F7A]" },
  ];

  return (
    <section className="dashboard-hero dashboard-reveal">
      <div className="relative z-10 px-6 py-5 lg:max-w-[74%] lg:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-text-primary">
              Welcome back <span aria-hidden="true" className="text-[14px]">👋</span>
            </p>
            <h1 className="mt-2 text-[28px] font-extrabold leading-[1.15] tracking-[-0.025em] text-text-primary">
              {greeting}, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="mt-2 text-[14px] leading-[1.5] text-text-secondary">
              Here&apos;s what&apos;s happening with your email marketing today.
            </p>
          </div>
          <form action={createDraftCampaignAction} className="shrink-0">
            <Button type="submit" className="h-10 rounded-[10px] px-5 text-[13px] font-semibold shadow-[0_8px_18px_-6px_rgb(11_95_255/0.6)]">
              <Plus size={16} strokeWidth={2.4} /> Create campaign
            </Button>
          </form>
        </div>

        <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex items-start gap-2.5 ${i > 0 ? "sm:border-l sm:border-[#CFDDF1] sm:pl-5" : ""}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${stat.tone}`}>
                <stat.icon size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <dt className="whitespace-nowrap text-[12px] font-semibold text-text-primary">{stat.label}</dt>
                <dd className="mt-0.5 text-[22px] font-extrabold leading-tight text-text-primary">{stat.value}</dd>
                <dd className="whitespace-nowrap text-[11.5px] text-text-secondary">{stat.caption}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <HeroArt className="pointer-events-none absolute bottom-0 right-0 hidden h-full max-h-[230px] w-auto lg:block" />
    </section>
  );
}
