"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { Users } from "lucide-react";

export function ContactGrowthChart({ data }: { data: { month: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div>
          <CardTitle>Contact growth</CardTitle>
          <CardDescription>New contacts added, last 6 months</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Users size={24} className="text-text-tertiary" />
            <p className="text-[13px] font-medium text-text-primary">No contacts yet</p>
            <p className="max-w-xs text-[12.5px] text-text-secondary">
              Add contacts manually or import a CSV to start seeing growth here.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatNumber(Number(value)), "New contacts"]}
                />
                <Bar dataKey="count" name="New contacts" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
