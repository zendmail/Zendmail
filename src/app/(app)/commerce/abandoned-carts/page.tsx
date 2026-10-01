import { redirect } from "next/navigation";
import { ShoppingBag, Store, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { listAbandonedCheckouts } from "@/lib/digital-commerce";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function AbandonedCheckoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const { hasStore, checkouts, potentialRecoveryValue } = await listAbandonedCheckouts(workspace.id);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Abandoned Checkouts</h1>
          <p className="mt-1 text-[13.5px] text-text-secondary">Recover revenue from checkouts left incomplete.</p>
        </div>
        {checkouts.length > 0 && (
          <form action={createDraftCampaignAction}>
            <Button type="submit">
              <Send size={15} />
              Create Recovery Campaign
            </Button>
          </form>
        )}
      </div>

      {!hasStore ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Store size={28} className="text-text-tertiary" />
          <div>
            <p className="text-[14px] font-medium text-text-primary">No store connected</p>
            <p className="mt-1 max-w-md text-[13px] text-text-secondary">
              Abandoned checkout data isn&apos;t available through this connection yet. Connect a store to detect
              incomplete checkouts here.
            </p>
          </div>
          <Link href="/commerce/stores">
            <Button variant="secondary" size="sm">
              Connect a store
            </Button>
          </Link>
        </Card>
      ) : checkouts.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <ShoppingBag size={28} className="text-text-tertiary" />
          <p className="text-[14px] font-medium text-text-primary">No abandoned checkouts</p>
          <p className="max-w-sm text-[13px] text-text-secondary">Nothing to recover right now — good sign.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <p className="text-[13px] text-text-secondary">Abandoned checkouts</p>
              <p className="mt-1 text-[26px] font-semibold text-text-primary">{formatNumber(checkouts.length)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-[13px] text-text-secondary">Potential recovery value</p>
              <p className="mt-1 text-[26px] font-semibold text-text-primary">
                {potentialRecoveryValue !== null ? formatCurrency(potentialRecoveryValue) : "Unavailable"}
              </p>
              {potentialRecoveryValue === null && (
                <p className="mt-1 text-[11.5px] text-text-tertiary">
                  Some checkouts are missing a value from the source platform.
                </p>
              )}
            </Card>
          </div>

          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Customer</TableHeadCell>
                  <TableHeadCell>Product</TableHeadCell>
                  <TableHeadCell>Value</TableHeadCell>
                  <TableHeadCell>Started</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {checkouts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-text-primary">{c.contactEmail ?? "Unknown"}</TableCell>
                    <TableCell className="text-text-secondary">{c.productName ?? "—"}</TableCell>
                    <TableCell className="text-text-secondary">{c.value ? formatCurrency(Number(c.value)) : "—"}</TableCell>
                    <TableCell className="text-text-tertiary">{new Date(c.startedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
