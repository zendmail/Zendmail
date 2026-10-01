import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BotArt } from "@/components/dashboard/dashboard-illustrations";
import type { DashboardInsight } from "@/lib/dashboard";

export function AiInsights({ insights, hasContacts }: { insights: DashboardInsight[]; hasContacts: boolean }) {
  return (
    <Card className="dashboard-card bg-gradient-to-b from-surface to-primary-surface/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-[17px] font-bold text-text-primary">
          <Sparkles size={24} className="text-primary" strokeWidth={2} />
          AI Insights
        </h2>
        <Link href="/ai/studio" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline">
          View all <ArrowRight size={13} />
        </Link>
      </div>

      <span className="mt-3 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide text-white">BETA</span>
      <h3 className="mt-2 text-[15.5px] font-bold leading-snug text-text-primary">Smarter insights, better results</h3>
      <p className="mt-1.5 text-[12.5px] leading-[1.55] text-text-secondary">
        Get AI-powered recommendations based on your contacts and campaign activity.
      </p>

      {insights.length === 0 ? (
        <div className="flex flex-col items-center pt-2 text-center">
          <BotArt className="h-[118px] w-auto" />
          <p className="mt-1 text-[14.5px] font-bold text-text-primary">No insights yet</p>
          <p className="mt-1.5 max-w-[230px] text-[12.5px] leading-[1.55] text-text-secondary">
            {hasContacts
              ? "Send campaigns and run automations to generate insights."
              : "Add contacts and start sending campaigns to generate insights."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {insights.map((insight) => (
            <Link
              key={insight.id}
              href={insight.href}
              className="block rounded-[12px] border border-border bg-surface p-3.5 transition-colors hover:border-primary/30"
            >
              <p className="text-[13px] font-semibold leading-[1.4] text-text-primary">{insight.title}</p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-text-secondary">{insight.description}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary">
                {insight.action}
                <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
