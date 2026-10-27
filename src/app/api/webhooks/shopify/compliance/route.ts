import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { digitalProducts, storeOrders, stores } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit";
import { findShopifyStoresByDomain, verifyShopifyWebhook } from "@/lib/shopify-webhook";

/**
 * Shopify mandatory privacy webhooks (customers/data_request, customers/redact, shop/redact).
 * Register this URL as the app's compliance webhook endpoint in the Shopify Partner dashboard.
 *
 * Personal data from Shopify lives in store_orders (customer name/email). Zendmail never forwards
 * it to third parties, so a data request is recorded for the merchant, redaction clears the
 * customer fields, and shop redaction deletes the store and everything synced from it.
 */
export async function POST(request: Request) {
  const verified = await verifyShopifyWebhook(request);
  if ("error" in verified) return verified.error;
  const { payload } = verified;

  const topic = request.headers.get("x-shopify-topic") ?? "";
  const shopDomain = typeof payload.shop_domain === "string" ? payload.shop_domain : "";
  const matching = await findShopifyStoresByDomain(shopDomain);
  // Acknowledge even when we hold nothing for this shop; Shopify only needs a 200.
  if (matching.length === 0) return Response.json({ received: true });

  if (topic === "customers/data_request") {
    for (const store of matching) {
      await recordAuditLog({
        action: "store.shopify.customer_data_request",
        workspaceId: store.workspaceId,
        metadata: { shop: shopDomain.toLowerCase(), requestId: payload.data_request ?? null },
      });
    }
    return Response.json({ received: true });
  }

  if (topic === "customers/redact") {
    const customer = (payload.customer ?? {}) as { email?: unknown };
    const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
    const orderIds = Array.isArray(payload.orders_to_redact) ? payload.orders_to_redact.map((id) => String(id)) : [];
    const externalIds = orderIds.map((id) => `gid://shopify/Order/${id}`);

    for (const store of matching) {
      const byEmail = email ? sql`lower(${storeOrders.customerEmail}) = ${email}` : undefined;
      const byOrder = externalIds.length > 0 ? inArray(storeOrders.externalId, externalIds) : undefined;
      const target = byEmail && byOrder ? sql`(${byEmail} or ${byOrder})` : (byEmail ?? byOrder);
      if (target) {
        await db
          .update(storeOrders)
          .set({ customerName: null, customerEmail: null, updatedAt: new Date() })
          .where(and(eq(storeOrders.storeId, store.id), target));
      }
      await recordAuditLog({
        action: "store.shopify.customer_redacted",
        workspaceId: store.workspaceId,
        metadata: { shop: shopDomain.toLowerCase(), orders: externalIds.length },
      });
    }
    return Response.json({ received: true });
  }

  if (topic === "shop/redact") {
    for (const store of matching) {
      await db.delete(digitalProducts).where(and(eq(digitalProducts.storeId, store.id), isNotNull(digitalProducts.storeId)));
      // store_orders and store_sync_jobs cascade with the store row.
      await db.delete(stores).where(and(eq(stores.id, store.id), eq(stores.workspaceId, store.workspaceId)));
      await recordAuditLog({
        action: "store.shopify.shop_redacted",
        workspaceId: store.workspaceId,
        metadata: { shop: shopDomain.toLowerCase() },
      });
    }
    return Response.json({ received: true });
  }

  return Response.json({ error: "Unsupported compliance topic." }, { status: 400 });
}
