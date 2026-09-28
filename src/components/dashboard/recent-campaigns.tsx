import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { CampaignStatusBadge } from "@/components/ui/badge";
import { formatNumber, formatPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";
import type { campaigns as campaignsTable } from "@/db/schema";

type Campaign = typeof campaignsTable.$inferSelect & {
  delivered: number;
  openRate: number | null;
  clickRate: number | null;
};

export function RecentCampaigns({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div>
          <CardTitle>Recent campaigns</CardTitle>
          <CardDescription>Latest sends and drafts from this workspace</CardDescription>
        </div>
        <Link href="/campaigns">
          <Button variant="secondary" size="sm">
            View all
          </Button>
        </Link>
      </CardHeader>
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-surface text-primary"><Send size={18} /></span>
          <p className="mt-1 text-[14px] font-semibold text-text-primary">No campaigns yet</p>
          <p className="max-w-sm text-[13px] leading-[1.5] text-text-secondary">Create your first campaign to start reaching your audience.</p>
          <form action={createDraftCampaignAction} className="mt-1">
            <Button type="submit" size="sm">Create campaign <ArrowRight size={14} /></Button>
          </form>
        </div>
      ) : (
        <div className="mt-4">
          <Table className="min-w-[760px]">
            <TableHead>
              <TableRow>
                <TableHeadCell>Campaign</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Recipients</TableHeadCell>
                <TableHeadCell>Open rate</TableHeadCell>
                <TableHeadCell>Click rate</TableHeadCell>
                <TableHeadCell>Date</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={c.status === "DRAFT" ? `/campaigns/${c.id}/audience` : `/campaigns/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {c.status === "DRAFT" ? "—" : formatNumber(c.recipientCount)}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {c.status === "SENT" && c.delivered > 0 && c.openRate !== null ? formatPercent(c.openRate) : "—"}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {c.status === "SENT" && c.delivered > 0 && c.clickRate !== null ? formatPercent(c.clickRate) : "—"}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {c.sentAt
                      ? new Date(c.sentAt).toLocaleDateString()
                      : c.scheduledAt
                        ? new Date(c.scheduledAt).toLocaleDateString()
                        : new Date(c.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
