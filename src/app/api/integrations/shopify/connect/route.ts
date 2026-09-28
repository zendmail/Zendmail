import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { isStoreCredentialsEncryptionConfigured } from "@/lib/store-credentials";
import { getRequestedShopifyScopes, isShopifyDomain } from "@/lib/shopify-auth";
import { rateLimit } from "@/lib/rate-limit";

const STATE_COOKIE = "zendmail_shopify_oauth_state";

function storesRedirect(reason: string) {
  const url = new URL("/commerce/stores", process.env.APP_URL || "http://localhost:3000");
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const configuredOrigin = new URL(process.env.APP_URL || "http://localhost:3000").origin;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (request.headers.get("origin") !== configuredOrigin || contentLength > 2048) {
    return Response.json({ error: "Invalid OAuth request." }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=%2Fcommerce%2Fstores", request.url));

  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) return NextResponse.redirect(new URL("/onboarding/create", request.url));

  const limit = await rateLimit("shopify-oauth-start", 20, 60 * 60);
  if (!limit.allowed) return storesRedirect("rate-limited");

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return storesRedirect("invalid-shop");
  }
  const shopValue = formData.get("shop");
  const shop = typeof shopValue === "string" ? shopValue.trim().toLowerCase() : "";
  if (!isShopifyDomain(shop)) return storesRedirect("invalid-shop");

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret || !isStoreCredentialsEncryptionConfigured()) {
    return storesRedirect("shopify-config");
  }

  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const redirectUri = new URL("/api/integrations/shopify/callback", baseUrl).toString();
  const state = randomBytes(32).toString("hex");
  const cookieValue = `${workspace.id}.${state}`;
  const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  let requestedScopes: string[];
  try {
    requestedScopes = getRequestedShopifyScopes();
  } catch {
    return storesRedirect("shopify-config");
  }
  authorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    scope: requestedScopes.join(","),
    redirect_uri: redirectUri,
    state,
  }).toString();

  const response = NextResponse.redirect(authorizeUrl, 303);
  response.cookies.set(STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/shopify",
    maxAge: 10 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}