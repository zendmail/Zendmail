import Link from "next/link";
import { ArrowRight, EllipsisVertical, Mail, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { CampaignStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPercent } from "@/lib/utils";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";
import type { campaigns as campaignsTable } from "@/db/schema";

type Campaign = typeof campaignsTable.$inferSelect & {
  typeLabel: string;
  delivered: number;
  openRate: number | null;
  clickRate: number | null;
};

const THUMB_PALETTES = [
  ["#1E3A8A", "#3B82F6"],
  ["#BE123C", "#FB7185"],
  ["#0F766E", "#2DD4BF"],
  ["#6D28D9", "#A78BFA"],
  ["#B45309", "#FBBF24"],
];

/** A tiny email-shaped placeholder, coloured deterministically from the campaign id. */
function CampaignThumb({ id }: { id: string }) {
  const hash = Array.from(id).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const [from, to] = THUMB_PALETTES[hash % THUMB_PALETTES.length];
  return (
    <span
      aria-hidden="true"
      className="relative flex h-[38px] w-[54px] shrink-0 flex-col justify-between overflow-hidden rounded-[6px] p-1.5 shadow-[var(--shadow-xs)]"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span className="h-1.5 w-7 rounded-full bg-white/80" />
      <span className="space-y-[3px]">
        <span className="block h-[3px] w-9 rounded-full bg-white/55" />
        <span className="block h-[3px] w-6 rounded-full bg-white/40" />
      </span>
    </span>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function RecentCampaigns({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <Card className="dashboard-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Mail size={24} className="mt-0.5 text-primary" strokeWidth={2} />
          <div>
            <h2 className="text-[16px] font-bold leading-tight text-text-primary">Recent campaigns</h2>
            <p className="mt-1 text-[13px] text-text-secondary">Your latest campaigns and their performance.</p>
          </div>
        </div>
        <Link href="/campaigns" className="inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-primary hover:underline">
          View all <ArrowRight size={14} />
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-border px-5 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-surface text-primary"><Send size={19} /></span>
          <p className="mt-1 text-[14.5px] font-bold text-text-primary">No campaigns yet</p>
          <p className="max-w-sm text-[12.5px] leading-[1.5] text-text-secondary">Create your first campaign to start reaching your audience.</p>
          <form action={createDraftCampaignAction} className="mt-1">
            <Button type="submit" className="h-10 rounded-[10px] px-5 text-[13px]">Create campaign <ArrowRight size={15} /></Button>
          </form>
        </div>
      ) : (
        <div className="mt-3">
          <Table className="min-w-[720px]">
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeadCell className="px-2 text-[11px] font-semibold tracking-[0.06em] text-[#5B6F93]">Campaign</TableHeadCell>
                <TableHeadCell className="px-2 text-[11px] font-semibold tracking-[0.06em] text-[#5B6F93]">Status</TableHeadCell>
                <TableHeadCell className="px-2 text-[11px] font-semibold tracking-[0.06em] text-[#5B6F93]">Recipients</TableHeadCell>
                <TableHeadCell className="px-2 text-[11px] font-semibold tracking-[0.06em] text-[#5B6F93]">Open rate</TableHeadCell>
                <TableHeadCell className="px-2 text-[11px] font-semibold tracking-[0.06em] text-[#5B6F93]">Click rate</TableHeadCell>
                <TableHeadCell className="px-2 text-[11px] font-semibold tracking-[0.06em] text-[#5B6F93]">Date</TableHeadCell>
                <TableHeadCell className="w-8 px-2"><span className="sr-only">Actions</span></TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((c) => {
                const href = c.status === "DRAFT" ? `/campaigns/${c.id}/audience` : `/campaigns/${c.id}`;
                const date = c.sentAt ?? c.scheduledAt ?? c.createdAt;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="px-2 py-2.5">
                      <Link href={href} className="flex items-center gap-3">
                        <CampaignThumb id={c.id} />
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-text-primary hover:underline">{c.name}</span>
                          <span className="block text-[12px] text-text-secondary">{c.typeLabel}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="px-2 py-2.5"><CampaignStatusBadge status={c.status} /></TableCell>
                    <TableCell className="px-2 py-2.5 text-[13px] font-semibold text-text-primary">
                      {c.status === "DRAFT" ? <span className="font-normal text-text-secondary">—</span> : formatNumber(c.recipientCount)}
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-[13px] font-semibold text-text-primary">
                      {c.status === "SENT" && c.delivered > 0 && c.openRate !== null ? formatPercent(c.openRate) : <span className="font-normal text-text-secondary">—</span>}
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-[13px] font-semibold text-text-primary">
                      {c.status === "SENT" && c.delivered > 0 && c.clickRate !== null ? formatPercent(c.clickRate) : <span className="font-normal text-text-secondary">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 py-2.5 text-[13px] text-text-secondary">{dateFormat.format(new Date(date))}</TableCell>
                    <TableCell className="px-2 py-2.5">
                      <Link href={href} aria-label={`Open ${c.name}`} className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-secondary hover:text-text-primary">
                        <EllipsisVertical size={16} />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
