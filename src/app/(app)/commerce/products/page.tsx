import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { listDigitalProducts } from "@/lib/digital-commerce";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function DigitalProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const { hasStore, products } = await listDigitalProducts(workspace.id);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Products</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Product catalog synced from connected stores.</p>
      </div>

      {!hasStore ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Store size={28} className="text-text-tertiary" />
          <div>
            <p className="text-[14px] font-medium text-text-primary">No store connected</p>
            <p className="mt-1 max-w-md text-[13px] text-text-secondary">
              Connect a supported store, then start a product sync to bring its catalog into this workspace.
            </p>
          </div>
          <Link href="/commerce/stores">
            <Button variant="secondary" size="sm">
              Connect a store
            </Button>
          </Link>
        </Card>
      ) : products.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <Package size={28} className="text-text-tertiary" />
          <p className="text-[14px] font-medium text-text-primary">No products synced yet</p>
            <p className="max-w-sm text-[13px] text-text-secondary">Your store is connected, but its product catalog has not synced yet.</p>
          <Link href="/commerce/stores" className="mt-1">
            <Button variant="secondary" size="sm">Sync store data</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link key={p.id} href={`/commerce/products/${p.id}`}>
              <Card className="h-full p-5 hover:border-border-strong transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold text-text-primary">{p.name}</p>
                  <Badge tone="neutral">{p.type}</Badge>
                </div>
                <p className="mt-2 text-[20px] font-semibold text-text-primary">
                  {p.price ? formatCurrency(Number(p.price)) : "—"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-text-secondary">
                  <div>
                    <p className="text-text-tertiary">Sales</p>
                    <p className="font-medium text-text-primary">
                      {p.totalSales !== null ? formatNumber(p.totalSales) : "Not synced"}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">Revenue</p>
                    <p className="font-medium text-text-primary">
                      {p.totalRevenue !== null ? formatCurrency(Number(p.totalRevenue)) : "Not synced"}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
