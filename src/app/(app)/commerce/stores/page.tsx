import { redirect } from "next/navigation";
import { Check, ExternalLink, PlugZap, Store, Unplug } from "lucide-react";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { stores, storeSyncJobs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { decryptStoreCredentials, isStoreCredentialsEncryptionConfigured } from "@/lib/store-credentials";
import { disconnectStoreAction } from "@/lib/actions/store-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopifyConnectForm, WooCommerceConnectForm } from "@/components/commerce/store-connect-forms";
import { StoreSyncControl } from "@/components/commerce/store-sync-control";

type StoresPageProps = {
  searchParams: Promise<{ connected?: string; disconnected?: string; error?: string }>;
};

const errorMessages: Record<string, string> = {
  "shopify-config": "Shopify app credentials or the store encryption key are not configured yet.",
  "invalid-shop": "Enter a valid *.myshopify.com domain and try again.",
  denied: "Shopify authorization was cancelled.",
  invalid: "Shopify authorization could not be verified. Start the connection again.",
  failed: "Shopify could not be connected. Verify the app scopes and try again.",
  "workspace-changed": "Your active workspace changed during Shopify authorization. Start again from this workspace.",
  "rate-limited": "Too many connection attempts. Please wait before trying again.",
  "store-not-found": "That store connection is no longer available.",
};

export default async function StoresPage({ searchParams }: StoresPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [params, storeRows] = await Promise.all([
    searchParams,
    db.select().from(stores).where(eq(stores.workspaceId, workspace.id)).orderBy(desc(stores.createdAt)),
  ]);
  const syncRows = storeRows.length > 0
    ? await db.select().from(storeSyncJobs)
      .where(inArray(storeSyncJobs.storeId, storeRows.map((store) => store.id)))
      .orderBy(desc(storeSyncJobs.createdAt))
    : [];
  const latestSyncByStore = new Map<string, (typeof syncRows)[number]>();
  syncRows.forEach((job) => {
    if (!latestSyncByStore.has(job.storeId)) latestSyncByStore.set(job.storeId, job);
  });

  const connections = storeRows.map((store) => {
    try {
      const credentials = decryptStoreCredentials(store.encryptedCredentials ?? "");
      if (credentials.provider !== store.provider) throw new Error("Store provider mismatch.");
      const isShopify = credentials.provider === "SHOPIFY";
      return {
        id: store.id,
        provider: credentials.provider,
        name: credentials.storeName,
        address: isShopify ? credentials.shopDomain : credentials.storeUrl,
        status: store.status,
        createdAt: store.createdAt,
        readable: true,
        supportsExtendedHistory: credentials.provider === "WOOCOMMERCE" || credentials.scopes.includes("read_all_orders"),
      };
    } catch {
      return {
        id: store.id,
        provider: store.provider,
        name: "Credentials need attention",
        address: "Reconnect this store to restore access.",
        status: "ERROR" as const,
        createdAt: store.createdAt,
        readable: false,
        supportsExtendedHistory: false,
      };
    }
  });

  const encryptionConfigured = isStoreCredentialsEncryptionConfigured();
  const shopifyConfigured = Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET && encryptionConfigured);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <header>
        <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.02em] text-text-primary">Store integrations</h1>
        <p className="mt-1 text-[14px] leading-[1.5] text-text-secondary">Connect your commerce platform to prepare your workspace for store data.</p>
      </header>

      {params.connected && <p role="status" className="rounded-[8px] border border-success/20 bg-success-surface px-4 py-3 text-[13px] font-medium text-success">Shopify store connected successfully.</p>}
      {params.disconnected && <p role="status" className="rounded-[8px] border border-border bg-surface px-4 py-3 text-[13px] text-text-secondary">Store disconnected from Zendmail.</p>}
      {params.error && errorMessages[params.error] && <p role="alert" className="rounded-[8px] border border-danger/20 bg-danger-surface px-4 py-3 text-[13px] text-danger">{errorMessages[params.error]}</p>}

      <section aria-label="Available store integrations" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary-surface text-primary"><Store size={18} /></span>
              <div>
                <CardTitle>Shopify</CardTitle>
                <p className="mt-0.5 text-[12px] text-text-secondary">Authorize securely with Shopify OAuth</p>
              </div>
            </div>
            <Badge tone={shopifyConfigured ? "success" : "warning"}>{shopifyConfigured ? "Ready" : "Setup required"}</Badge>
          </CardHeader>
          <CardContent>
            <ShopifyConnectForm configured={shopifyConfigured} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-surface-secondary text-text-secondary"><PlugZap size={18} /></span>
              <div>
                <CardTitle>WooCommerce</CardTitle>
                <p className="mt-0.5 text-[12px] text-text-secondary">Verify a read-only REST API key</p>
              </div>
            </div>
            <Badge tone={encryptionConfigured ? "success" : "warning"}>{encryptionConfigured ? "Ready" : "Setup required"}</Badge>
          </CardHeader>
          <CardContent>
            <WooCommerceConnectForm configured={encryptionConfigured} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="connected-stores-heading">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="connected-stores-heading" className="text-[16px] font-semibold text-text-primary">Connected stores</h2>
            <p className="mt-0.5 text-[13px] text-text-secondary">Connections are private to this workspace.</p>
          </div>
          <span className="text-[12px] font-medium text-text-tertiary">{connections.length} {connections.length === 1 ? "store" : "stores"}</span>
        </div>

        {connections.length === 0 ? (
          <Card className="flex min-h-36 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-surface-secondary text-text-tertiary"><Store size={17} /></span>
            <p className="text-[14px] font-semibold text-text-primary">No stores connected</p>
            <p className="max-w-md text-[13px] leading-[1.5] text-text-secondary">Connect Shopify or verify a WooCommerce read-only key. Product and order syncing can be added after authorization.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {connections.map((connection) => (
              <Card key={connection.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-success-surface text-success"><Check size={17} /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[14px] font-semibold text-text-primary">{connection.name}</h3>
                        <Badge tone={connection.status === "CONNECTED" ? "success" : "warning"}>
                          {connection.status === "CONNECTED" ? "Connected" : "Reconnect needed"}
                        </Badge>
                      </div>
                      <p className="mt-1 break-all text-[12px] text-text-secondary">{connection.address}</p>
                      <p className="mt-1 text-[11px] text-text-tertiary">{connection.provider === "SHOPIFY" ? "Shopify" : "WooCommerce"} · connected {connection.createdAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  {connection.readable && (
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={disconnectStoreAction}>
                        <input type="hidden" name="storeId" value={connection.id} />
                        <Button type="submit" size="sm" variant="secondary" aria-label={`Disconnect ${connection.name}`}>
                          <Unplug size={14} /> Disconnect
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
                {connection.readable && connection.status === "CONNECTED" && (
                  <StoreSyncControl
                    storeId={connection.id}
                    provider={connection.provider}
                    supportsExtendedHistory={connection.supportsExtendedHistory}
                    job={latestSyncByStore.get(connection.id) ?? null}
                  />
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 text-[12px] leading-[1.5] text-text-tertiary">
        <ExternalLink size={14} className="mt-0.5 shrink-0" />
        Disconnecting removes credentials from Zendmail. Revoke a WooCommerce key in WooCommerce settings or uninstall Zendmail in Shopify to revoke provider access too.
      </p>
    </div>
  );
}
