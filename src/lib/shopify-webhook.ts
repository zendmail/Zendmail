import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
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

/** Reads the raw body and verifies Shopify's HMAC. Returns the parsed JSON, or a ready-made error Response. */
export async function verifyShopifyWebhook(request: Request): Promise<{ payload: Record<string, unknown> } | { error: Response }> {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) return { error: Response.json({ error: "Webhook verification is not configured." }, { status: 503 }) };

  const rawBody = await readLimitedBody(request);
  if (!rawBody) return { error: Response.json({ error: "Invalid webhook payload." }, { status: 413 }) };

  const supplied = Buffer.from(request.headers.get("x-shopify-hmac-sha256") ?? "", "base64");
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { error: Response.json({ error: "Invalid webhook signature." }, { status: 401 }) };
  }

  try {
    const payload = JSON.parse(rawBody.toString("utf8"));
    if (typeof payload !== "object" || payload === null) throw new Error("not an object");
    return { payload: payload as Record<string, unknown> };
  } catch {
    return { error: Response.json({ error: "Invalid webhook payload." }, { status: 400 }) };
  }
}

/** Connected Shopify stores whose (encrypted) credentials match the given *.myshopify.com domain. */
export async function findShopifyStoresByDomain(shopDomain: string) {
  if (!isShopifyDomain(shopDomain)) return [];
  const shop = shopDomain.toLowerCase();
  const rows = await db.select().from(stores).where(eq(stores.provider, "SHOPIFY"));
  return rows.filter((store) => {
    try {
      const credentials = decryptStoreCredentials(store.encryptedCredentials ?? "");
      return credentials.provider === "SHOPIFY" && credentials.shopDomain === shop;
    } catch {
      return false;
    }
  });
}
