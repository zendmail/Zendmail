"use client";

import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPercent } from "@/lib/utils";

type CampaignPerformancePoint = {
  id: string;
  name: string;
  chartLabel: string;
  sent: number;
  openRate: number;
  clickRate: number;
};

export function CampaignPerformance({ data }: { data: CampaignPerformancePoint[] }) {
  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div>
          <CardTitle>Campaign performance</CardTitle>
          <CardDescription>Recent sent campaigns: delivery and engagement</CardDescription>
        </div>
        <Link href="/analytics/campaigns" className="text-[12px] font-semibold text-primary hover:underline">
          View analytics <ArrowRight size={13} className="ml-1 inline" />
        </Link>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-surface-secondary/45 px-5 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-surface text-primary">
              <BarChart3 size={19} />
            </span>
            <p className="mt-1 text-[14px] font-semibold text-text-primary">No campaign data yet</p>
            <p className="max-w-sm text-[13px] leading-[1.5] text-text-secondary">
              Create your first campaign to start tracking performance.
            </p>
            <form action={createDraftCampaignAction} className="mt-1">
              <Button type="submit" size="sm">Create campaign <ArrowRight size={14} /></Button>
            </form>
          </div>
        ) : (
          <div className="h-[250px] w-full" role="img" aria-label="Recent campaign sent volume, open rate and click rate chart">
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
                <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="sent" dataKey="sent" name="Sent" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line yAxisId="rate" type="monotone" dataKey="openRate" name="Open rate" stroke="#0F8F86" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="rate" type="monotone" dataKey="clickRate" name="Click rate" stroke="#D97706" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}