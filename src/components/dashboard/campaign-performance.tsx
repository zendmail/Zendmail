"use client";

import Link from "next/link";
import { ArrowRight, ChartColumn } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartSearchArt } from "@/components/dashboard/dashboard-illustrations";
import { PerformanceRangeSelect } from "@/components/dashboard/performance-range-select";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";
import { formatNumber, formatPercent } from "@/lib/utils";

type CampaignPerformancePoint = {
  id: string;
  name: string;
  chartLabel: string;
  sent: number;
  openRate: number;
  clickRate: number;
};

const OPEN = "#0B5FFF";
const CLICK = "#8B5CF6";
const SENT = "#10B981";

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-text-secondary">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function CampaignPerformance({
  data,
  range,
  hasSentCampaigns,
}: {
  data: CampaignPerformancePoint[];
  range: string;
  hasSentCampaigns: boolean;
}) {
  return (
    <Card className="dashboard-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ChartColumn size={24} className="mt-0.5 text-primary" strokeWidth={2.2} />
          <div>
            <h2 className="text-[16px] font-bold leading-tight text-text-primary">Campaign performance</h2>
            <p className="mt-1 text-[13px] text-text-secondary">Track how your campaigns are performing over time.</p>
          </div>
        </div>
        <PerformanceRangeSelect value={range} />
      </div>

      <div className="mt-4 rounded-[14px] border border-border bg-surface-secondary/40 p-4">
        <div className="flex items-center justify-end gap-4">
          <LegendItem color={OPEN} label="Open rate" />
          <LegendItem color={CLICK} label="Click rate" />
          <LegendItem color={SENT} label="Sent" />
        </div>

        {data.length === 0 ? (
          <div className="flex min-h-[210px] flex-col items-center justify-center gap-1 pb-3 text-center">
            <ChartSearchArt className="h-[92px] w-auto" />
            {hasSentCampaigns ? (
              <>
                <p className="mt-1 text-[14.5px] font-bold text-text-primary">No campaigns sent in this period</p>
                <p className="max-w-sm text-[12.5px] leading-[1.5] text-text-secondary">
                  Try a longer time range to see earlier campaigns.
                </p>
                <Link href="/analytics/campaigns" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
                  View campaign analytics <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-[14.5px] font-bold text-text-primary">No campaign data yet</p>
                <p className="max-w-sm text-[12.5px] leading-[1.5] text-text-secondary">
                  Create your first campaign to start tracking performance.
                </p>
                <form action={createDraftCampaignAction} className="mt-3">
                  <Button type="submit" className="h-10 rounded-[10px] px-5 text-[13px]">
                    Create campaign <ArrowRight size={15} />
                  </Button>
                </form>
              </>
            )}
          </div>
        ) : (
          <div className="mt-2 h-[240px] w-full" role="img" aria-label="Recent campaign sent volume, open rate and click rate chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="chartLabel" stroke="var(--color-text-tertiary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="sent" stroke="var(--color-text-tertiary)" fontSize={11} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
                <YAxis yAxisId="rate" orientation="right" stroke="var(--color-text-tertiary)" fontSize={11} tickLine={false} axisLine={false} width={38} unit="%" />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? "Campaign"}
                  formatter={(value, name) => [
                    name === "Sent" ? formatNumber(Number(value)) : formatPercent(Number(value)),
                    name,
                  ]}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar yAxisId="sent" dataKey="sent" name="Sent" fill={SENT} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line yAxisId="rate" type="monotone" dataKey="openRate" name="Open rate" stroke={OPEN} strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="rate" type="monotone" dataKey="clickRate" name="Click rate" stroke={CLICK} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
