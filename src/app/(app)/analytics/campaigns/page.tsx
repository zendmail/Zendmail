import { redirect } from "next/navigation";
import Link from "next/link";
import { LineChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ComingSoon } from "@/components/analytics/coming-soon";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { listCampaignPerformance } from "@/lib/analytics";
import { formatNumber, formatPercent } from "@/lib/utils";

export default async function CampaignAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const campaigns = await listCampaignPerformance(workspace.id);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Campaign analytics</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Performance for every campaign you&apos;ve sent.</p>
      </div>

      {campaigns.length === 0 ? (
        <ComingSoon
          icon={LineChart}
          title="No sent campaigns yet"
          description="Once you send a campaign, delivery, open, and click performance will show up here."
        />
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Campaign</TableHeadCell>
                <TableHeadCell>Sent</TableHeadCell>
                <TableHeadCell>Delivered</TableHeadCell>
                <TableHeadCell>Open rate</TableHeadCell>
                <TableHeadCell>Click rate</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/campaigns/${c.id}`} className="font-medium text-text-primary hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-text-secondary">{formatNumber(c.recipientCount)}</TableCell>
                  <TableCell className="text-text-secondary">{formatNumber(c.delivered)}</TableCell>
                  <TableCell className="text-text-secondary">{formatPercent(c.openRate)}</TableCell>
                  <TableCell className="text-text-secondary">{formatPercent(c.clickRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
