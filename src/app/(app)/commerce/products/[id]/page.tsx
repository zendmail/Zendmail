import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getDigitalProductDetail } from "@/lib/digital-commerce";
import { formatCurrency, formatNumber } from "@/lib/utils";

const accessLabel: Record<string, string> = {
  NOT_ACCESSED: "Not accessed",
  ACCESSED_ONCE: "Accessed once",
  ACCESSED_MULTIPLE: "Accessed multiple times",
};

export default async function DigitalProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const detail = await getDigitalProductDetail(workspace.id, id);
  if (!detail) notFound();

  const { product, purchases, unaccessedCount } = detail;

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Link
        href="/commerce/products"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to products
      </Link>

      <div className="flex items-center gap-2.5">
        <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-text-primary">{product.name}</h1>
        <Badge tone="neutral">{product.type}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Price", value: product.price ? formatCurrency(Number(product.price)) : "—" },
          { label: "Total sales", value: product.totalSales !== null ? formatNumber(product.totalSales) : "Not synced" },
          {
            label: "Total revenue",
            value: product.totalRevenue !== null ? formatCurrency(Number(product.totalRevenue)) : "Not synced",
          },
          { label: "Refunds", value: product.refundCount !== null ? formatNumber(product.refundCount) : "Not synced" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-[12px] text-text-secondary">{stat.label}</p>
            <p className="mt-1 text-[17px] font-semibold text-text-primary">{stat.value}</p>
          </Card>
        ))}
      </div>

      {unaccessedCount > 0 && (
        <Card className="flex items-start gap-3 border-warning-surface bg-warning-surface/30 p-4">
          <AlertCircle size={16} className="mt-0.5 text-warning" />
          <div>
            <p className="text-[13px] font-medium text-text-primary">
              {formatNumber(unaccessedCount)} customer{unaccessedCount === 1 ? " has" : "s have"} purchased this but
              not accessed it
            </p>
            <p className="mt-0.5 text-[12.5px] text-text-secondary">
              Consider a helpful reminder email pointing them to their download or course access.
            </p>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent purchases</CardTitle>
        </CardHeader>
        {purchases.length === 0 ? (
          <CardContent>
            <p className="py-8 text-center text-[13px] text-text-tertiary">No purchases recorded yet.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Customer</TableHeadCell>
                <TableHeadCell>Amount</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Access</TableHeadCell>
                <TableHeadCell>Date</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-text-primary">{p.contactName ?? p.contactEmail}</TableCell>
                  <TableCell className="text-text-secondary">{formatCurrency(Number(p.amount))}</TableCell>
                  <TableCell>
                    <Badge tone={p.status === "COMPLETED" ? "success" : p.status === "REFUNDED" ? "danger" : "warning"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {p.accessStatus ? accessLabel[p.accessStatus] : "Not available through this connection"}
                  </TableCell>
                  <TableCell className="text-text-tertiary">{new Date(p.purchasedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
