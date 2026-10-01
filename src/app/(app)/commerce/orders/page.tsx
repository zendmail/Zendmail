import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { db } from "@/db/client";
import { stores, storeOrders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "@/components/ui/table";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [orders, connectedStores] = await Promise.all([
    db.select({ order: storeOrders, provider: stores.provider })
      .from(storeOrders)
      .innerJoin(stores, eq(storeOrders.storeId, stores.id))
      .where(eq(storeOrders.workspaceId, workspace.id))
      .orderBy(desc(storeOrders.placedAt))
      .limit(100),
    db.select({ id: stores.id }).from(stores)
      .where(and(eq(stores.workspaceId, workspace.id), eq(stores.status, "CONNECTED"))),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <header>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Orders</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Synced order history from your connected stores.</p>
      </header>

      {orders.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-5 py-14 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-surface text-primary"><ShoppingCart size={18} /></span>
          <p className="mt-1 text-[14px] font-semibold text-text-primary">
            {connectedStores.length === 0 ? "No connected stores" : "No synced orders yet"}
          </p>
          <p className="max-w-md text-[13px] leading-[1.5] text-text-secondary">
            {connectedStores.length === 0
              ? "Connect Shopify or WooCommerce first, then choose an order history range to sync."
              : "Your stores are connected. Start a sync and choose how much order history to import."}
          </p>
          <Link href="/commerce/stores" className="mt-1">
            <Button variant="secondary" size="sm">
              {connectedStores.length === 0 ? "Connect a store" : "Sync store data"} <ArrowRight size={14} />
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>Latest {orders.length} orders across this workspace&apos;s connected stores.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Table className="min-w-[780px]">
              <TableHead>
                <TableRow>
                  <TableHeadCell>Order</TableHeadCell>
                  <TableHeadCell>Store</TableHeadCell>
                  <TableHeadCell>Customer</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Total</TableHeadCell>
                  <TableHeadCell>Date</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map(({ order, provider }) => {
                  const financialStatus = order.financialStatus.toLowerCase();
                  const tone = ["paid", "processing", "completed"].includes(financialStatus)
                    ? "success"
                    : ["refunded", "cancelled", "failed", "voided"].includes(financialStatus)
                      ? "warning"
                      : "neutral";
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-text-primary">#{order.orderNumber}</TableCell>
                      <TableCell className="text-text-secondary">{provider === "SHOPIFY" ? "Shopify" : "WooCommerce"}</TableCell>
                      <TableCell>
                        <p className="text-[13px] text-text-primary">{order.customerName || "Customer"}</p>
                        {order.customerEmail && <p className="mt-0.5 text-[12px] text-text-secondary">{order.customerEmail}</p>}
                      </TableCell>
                      <TableCell><Badge tone={tone}>{financialStatus.replaceAll("_", " ")}</Badge></TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(order.total), order.currency)}</TableCell>
                      <TableCell className="text-text-secondary">{order.placedAt.toLocaleDateString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
