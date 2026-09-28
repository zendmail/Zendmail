import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { StoreCredentials } from "@/lib/store-credentials";

export const shopifyScopes = ["read_products", "read_orders", "read_customers"] as const;
const optionalShopifyScopes = ["read_all_orders"] as const;
export const shopifyApiVersion = process.env.SHOPIFY_API_VERSION || "2026-07";

export function getRequestedShopifyScopes() {
  const configuredExtras = (process.env.SHOPIFY_EXTRA_SCOPES ?? "").split(",").map((scope) => scope.trim()).filter(Boolean);
  if (configuredExtras.some((scope) => !optionalShopifyScopes.includes(scope as (typeof optionalShopifyScopes)[number]))) {
    throw new Error("SHOPIFY_EXTRA_SCOPES contains an unsupported scope.");
  }
  return [...shopifyScopes, ...new Set(configuredExtras)];
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token_expires_in: z.number().int().positive(),
  scope: z.string(),
});

export function isShopifyDomain(value: string) {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(value);
}

export function verifyShopifyCallbackHmac(params: URLSearchParams, secret: string) {
  const suppliedHex = params.get("hmac");
  if (!suppliedHex || !/^[a-f0-9]{64}$/i.test(suppliedHex)) return false;

  const entries = [...params.entries()].filter(([key]) => key !== "hmac" && key !== "signature");
  if (new Set(entries.map(([key]) => key)).size !== entries.length) return false;

  const message = entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const expected = createHmac("sha256", secret).update(message).digest();
  const supplied = Buffer.from(suppliedHex, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function exchangeShopifyCode(shop: string, code: string) {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Shopify OAuth credentials are not configured.");

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      expiring: "1",
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Shopify token exchange failed.");

  const payload: unknown = await response.json();
  const token = tokenResponseSchema.parse(payload);
  const grantedScopes = token.scope.split(",").map((scope) => scope.trim());
  const missingScopes = shopifyScopes.filter((scope) => !grantedScopes.includes(scope));
  if (missingScopes.length > 0) throw new Error(`Shopify did not grant required scopes: ${missingScopes.join(", ")}.`);

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
    refreshTokenExpiresAt: Date.now() + token.refresh_token_expires_in * 1000,
    scopes: grantedScopes,
  };
}

export async function refreshShopifyCredentials(credentials: Extract<StoreCredentials, { provider: "SHOPIFY" }>) {
  if (credentials.accessTokenExpiresAt > Date.now() + 60_000) return credentials;
  if (credentials.refreshTokenExpiresAt <= Date.now()) throw new Error("Shopify authorization expired. Reconnect this store.");

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Shopify OAuth credentials are not configured.");

  const response = await fetch(`https://${credentials.shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Shopify token refresh failed. Reconnect this store if the authorization was revoked.");

  const token = tokenResponseSchema.parse(await response.json());
  return {
    ...credentials,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
    refreshTokenExpiresAt: Date.now() + token.refresh_token_expires_in * 1000,
    scopes: token.scope.split(",").map((scope) => scope.trim()),
  };
}