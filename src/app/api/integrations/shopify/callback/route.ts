import { timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { encryptStoreCredentials, decryptStoreCredentials } from "@/lib/store-credentials";
import { exchangeShopifyCode, isShopifyDomain, shopifyApiVersion, verifyShopifyCallbackHmac } from "@/lib/shopify-auth";
import { recordAuditLog } from "@/lib/audit";

const STATE_COOKIE = "zendmail_shopify_oauth_state";

function storesRedirect(result: "connected" | "invalid" | "denied" | "failed" | "workspace-changed") {
  const url = new URL("/commerce/stores", process.env.APP_URL || "http://localhost:3000");
  if (result === "connected") url.searchParams.set("connected", "shopify");
  else url.searchParams.set("error", result);
  return NextResponse.redirect(url);
}

function expireStateCookie(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/shopify",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return expireStateCookie(NextResponse.redirect(new URL("/login?next=%2Fcommerce%2Fstores", request.url)));

  const query = new URL(request.url).searchParams;
  const cookieStore = await import("next/headers").then(({ cookies }) => cookies());
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  const response = storesRedirect("invalid");
  expireStateCookie(response);

  if (!storedState || !query.get("state")) return response;
  const separator = storedState.indexOf(".");
  if (separator < 1) return response;
  const boundWorkspaceId = storedState.slice(0, separator);
  const expectedState = storedState.slice(separator + 1);
  const suppliedState = query.get("state")!;
  const expectedBytes = Buffer.from(expectedState);
  const suppliedBytes = Buffer.from(suppliedState);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) return response;

  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace || workspace.id !== boundWorkspaceId) return expireStateCookie(storesRedirect("workspace-changed"));

  const shop = query.get("shop")?.toLowerCase() ?? "";
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  const timestamp = Number(query.get("timestamp"));
  const timestampIsFresh = Number.isFinite(timestamp) && Math.abs(Date.now() / 1000 - timestamp) <= 5 * 60;
  if (
    query.has("error") ||
    !isShopifyDomain(shop) ||
    !secret ||
    !timestampIsFresh ||
    !verifyShopifyCallbackHmac(query, secret)
  ) {
    return expireStateCookie(storesRedirect(query.get("error") === "access_denied" ? "denied" : "invalid"));
  }

  const code = query.get("code");
  if (!code || code.length > 2048) return expireStateCookie(storesRedirect("invalid"));

  try {
    const token = await exchangeShopifyCode(shop, code);
    const responseFromShop = await fetch(`https://${shop}/admin/api/${shopifyApiVersion}/graphql.json`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token.accessToken,
      },
      body: JSON.stringify({ query: "query ZendmailStoreIdentity { shop { name myshopifyDomain } }" }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!responseFromShop.ok) throw new Error("Could not verify the Shopify store.");

    const payload = await responseFromShop.json() as {
      data?: { shop?: { name?: string; myshopifyDomain?: string } };
      errors?: unknown[];
    };
    const shopIdentity = payload.data?.shop;
    if (payload.errors?.length || !shopIdentity?.name || shopIdentity.myshopifyDomain?.toLowerCase() !== shop) {
      throw new Error("Shopify returned an invalid store identity.");
    }

    const encryptedCredentials = encryptStoreCredentials({
      provider: "SHOPIFY",
      shopDomain: shop,
      storeName: shopIdentity.name,
      ...token,
    });

    const existingRows = await db
      .select()
      .from(stores)
      .where(and(eq(stores.workspaceId, workspace.id), eq(stores.provider, "SHOPIFY")));
    const existing = existingRows.find((row) => {
      try {
        const credentials = decryptStoreCredentials(row.encryptedCredentials ?? "");
        return credentials.provider === "SHOPIFY" && credentials.shopDomain === shop;
      } catch {
        return false;
      }
    });

    if (existing) {
      await db.update(stores)
        .set({ status: "CONNECTED", encryptedCredentials: encryptedCredentials })
        .where(and(eq(stores.id, existing.id), eq(stores.workspaceId, workspace.id)));
    } else {
      await db.insert(stores).values({
        workspaceId: workspace.id,
        provider: "SHOPIFY",
        status: "CONNECTED",
        encryptedCredentials,
      });
    }

    await recordAuditLog({
      action: "store.shopify.connected",
      userId: user.id,
      workspaceId: workspace.id,
      metadata: { shop },
    });
    return expireStateCookie(storesRedirect("connected"));
  } catch {
    return expireStateCookie(storesRedirect("failed"));
  }
}