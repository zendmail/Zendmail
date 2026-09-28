import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit";
import { decryptStoreCredentials } from "@/lib/store-credentials";
import { isShopifyDomain } from "@/lib/shopify-auth";

const MAX_WEBHOOK_BYTES = 256 * 1024;

async function readLimitedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_WEBHOOK_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) return Response.json({ error: "Webhook verification is not configured." }, { status: 503 });

  const rawBody = await readLimitedBody(request);
  if (!rawBody) return Response.json({ error: "Invalid webhook payload." }, { status: 413 });

  const suppliedHmac = request.headers.get("x-shopify-hmac-sha256") ?? "";
  let suppliedDigest: Buffer;
  try {
    suppliedDigest = Buffer.from(suppliedHmac, "base64");
  } catch {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }
  const expectedDigest = createHmac("sha256", secret).update(rawBody).digest();
  if (suppliedDigest.length !== expectedDigest.length || !timingSafeEqual(suppliedDigest, expectedDigest)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let shop: string;
  try {
    const payload = JSON.parse(rawBody.toString("utf8")) as { myshopify_domain?: unknown; domain?: unknown };
    const candidate = typeof payload.myshopify_domain === "string" ? payload.myshopify_domain : payload.domain;
    if (typeof candidate !== "string" || !isShopifyDomain(candidate)) {
      return Response.json({ error: "Invalid Shopify store domain." }, { status: 400 });
    }
    shop = candidate.toLowerCase();
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const shopifyStores = await db.select().from(stores).where(eq(stores.provider, "SHOPIFY"));
  const matchingStores = shopifyStores.filter((store) => {
    try {
      const credentials = decryptStoreCredentials(store.encryptedCredentials ?? "");
      return credentials.provider === "SHOPIFY" && credentials.shopDomain === shop;
    } catch {
      return false;
    }
  });

  for (const store of matchingStores) {
    await db.delete(stores).where(and(eq(stores.id, store.id), eq(stores.workspaceId, store.workspaceId)));
    await recordAuditLog({
      action: "store.shopify.uninstalled",
      workspaceId: store.workspaceId,
      metadata: { shop },
    });
  }

  return Response.json({ received: true });
}