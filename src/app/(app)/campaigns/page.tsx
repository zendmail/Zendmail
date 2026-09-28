import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { CampaignStatusBadge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { listCampaigns } from "@/lib/campaigns";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";
import { formatNumber } from "@/lib/utils";

export default async function CampaignsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const campaigns = await listCampaigns(workspace.id);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Campaigns</h1>
          <p className="mt-1 text-[13.5px] text-text-secondary">
            {formatNumber(campaigns.length)} campaign{campaigns.length === 1 ? "" : "s"}
          </p>
        </div>
        <form action={createDraftCampaignAction}>
          <Button type="submit">
            <Plus size={15} />
            Create campaign
          </Button>
        </form>
      </div>

      {campaigns.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <Send size={28} className="text-text-tertiary" />
          <p className="text-[14px] font-medium text-text-primary">No campaigns yet</p>
          <p className="max-w-sm text-[13px] text-text-secondary">
            Create your first campaign — choose an audience, write the content, and send or schedule it.
          </p>
          <form action={createDraftCampaignAction} className="mt-2">
            <Button size="sm" type="submit">
              Create your first campaign
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Campaign</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Recipients</TableHeadCell>
                <TableHeadCell>Sent / Scheduled</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((c) => {
                const href =
                  c.status === "DRAFT"
                    ? `/campaigns/${c.id}/audience`
                    : `/campaigns/${c.id}`;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={href} className="font-medium text-text-primary hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-text-tertiary mt-0.5">{c.subject || "No subject yet"}</p>
                    </TableCell>
                    <TableCell>
                      <CampaignStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {c.status === "DRAFT" ? "—" : formatNumber(c.recipientCount)}
                    </TableCell>
                    <TableCell className="text-text-tertiary">
                      {c.sentAt
                        ? new Date(c.sentAt).toLocaleString()
                        : c.scheduledAt
                          ? new Date(c.scheduledAt).toLocaleString()
                          : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
