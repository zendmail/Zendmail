import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { DashboardInsight } from "@/lib/dashboard";

export function AiInsights({ insights, hasContacts }: { insights: DashboardInsight[]; hasContacts: boolean }) {
  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={15} className="text-primary" />
            AI insights
          </CardTitle>
          <CardDescription>Generated from your contacts, campaigns, and automation data</CardDescription>
        </div>
      </CardHeader>
      <div className="space-y-2 px-5 pb-5 pt-3">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center rounded-[var(--radius-md)] border border-dashed border-border bg-surface-secondary/40 px-4 py-5 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary-surface text-primary"><Sparkles size={17} /></span>
            <p className="mt-2 text-[14px] font-semibold text-text-primary">Insights will appear here</p>
            <p className="mt-1 max-w-xs text-[13px] leading-[1.5] text-text-secondary">
              {hasContacts
                ? "Send campaigns and run automations to uncover useful next steps."
                : "Add contacts and start sending campaigns to generate insights."}
            </p>
            <Link href={hasContacts ? "/campaigns" : "/contacts/import"} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
              {hasContacts ? "Create campaign" : "Import contacts"} <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          insights.map((insight) => (
            <Link
              key={insight.id}
              href={insight.href}
              className="block rounded-[var(--radius-md)] border border-border p-4 hover:border-border-strong hover:bg-surface-secondary/50 transition-colors"
            >
              <p className="text-[13px] font-semibold leading-[1.4] text-text-primary">{insight.title}</p>
              <p className="mt-1 text-[13px] leading-[1.5] text-text-secondary">{insight.description}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-primary">
                {insight.action}
                <ArrowRight size={13} />
              </span>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}
