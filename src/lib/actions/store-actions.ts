"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { stores, storeSyncJobs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { encryptStoreCredentials, decryptStoreCredentials } from "@/lib/store-credentials";
import { rateLimit } from "@/lib/rate-limit";
import { requestWooCommerceJson, WooCommerceRequestError } from "@/lib/woocommerce-client";
import type { ActionState } from "@/lib/actions/auth-actions";

const wooCommerceSchema = z.object({
  storeUrl: z.string().trim().url("Enter the full HTTPS address of your WooCommerce store."),
  consumerKey: z.string().trim().regex(/^ck_[A-Za-z0-9]+$/, "Enter a valid WooCommerce read-only consumer key."),
  consumerSecret: z.string().trim().regex(/^cs_[A-Za-z0-9]+$/, "Enter a valid WooCommerce consumer secret."),
});

const storeSyncSchema = z.object({
  storeId: z.string().uuid(),
  requestedRange: z.enum(["LAST_30_DAYS", "LAST_90_DAYS", "ALL_HISTORY"]),
});

export async function connectWooCommerceAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const limit = await rateLimit("woocommerce-connect", 10, 60 * 60);
  if (!limit.allowed) return { error: limit.message };

  const parsed = wooCommerceSchema.safeParse({
    storeUrl: formData.get("storeUrl"),
    consumerKey: formData.get("consumerKey"),
    consumerSecret: formData.get("consumerSecret"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the WooCommerce connection details." };
  if (!process.env.STORE_CREDENTIALS_ENCRYPTION_KEY) return { error: "Store credential encryption is not configured." };

  const normalizedUrl = new URL(parsed.data.storeUrl);
  normalizedUrl.pathname = normalizedUrl.pathname.replace(/\/+$/, "");
  const storeUrl = normalizedUrl.toString().replace(/\/$/, "");
  try {
    await requestWooCommerceJson(
      { storeUrl, consumerKey: parsed.data.consumerKey, consumerSecret: parsed.data.consumerSecret },
      "orders",
      { per_page: "1" }
    );
  } catch (error) {
    return { error: error instanceof WooCommerceRequestError ? error.message : "WooCommerce connection verification failed." };
  }

  let encryptedCredentials: string;
  try {
    encryptedCredentials = encryptStoreCredentials({
      provider: "WOOCOMMERCE",
      storeUrl,
      storeName: normalizedUrl.hostname,
      consumerKey: parsed.data.consumerKey,
      consumerSecret: parsed.data.consumerSecret,
    });
  } catch {
    return { error: "Store credentials could not be encrypted. Check the server configuration." };
  }

  const existingRows = await db
    .select()
    .from(stores)
    .where(and(eq(stores.workspaceId, workspace.id), eq(stores.provider, "WOOCOMMERCE")));
  const existing = existingRows.find((row) => {
    try {
      const credentials = decryptStoreCredentials(row.encryptedCredentials ?? "");
      return credentials.provider === "WOOCOMMERCE" && credentials.storeUrl === storeUrl;
    } catch {
      return false;
    }
  });

  if (existing) {
    await db.update(stores)
      .set({ status: "CONNECTED", encryptedCredentials })
      .where(and(eq(stores.id, existing.id), eq(stores.workspaceId, workspace.id)));
  } else {
    await db.insert(stores).values({
      workspaceId: workspace.id,
      provider: "WOOCOMMERCE",
      status: "CONNECTED",
      encryptedCredentials,
    });
  }

  await recordAuditLog({
    action: "store.woocommerce.connected",
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { hostname: normalizedUrl.hostname },
  });
  revalidatePath("/commerce/stores");
  return { success: "WooCommerce store connected securely." };
}

export async function disconnectStoreAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const storeId = String(formData.get("storeId"));
  const [store] = await db.select({ id: stores.id, provider: stores.provider })
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.workspaceId, workspace.id)))
    .limit(1);
  if (!store) redirect("/commerce/stores?error=store-not-found");

  await db.delete(stores).where(and(eq(stores.id, store.id), eq(stores.workspaceId, workspace.id)));
  await recordAuditLog({
    action: "store.disconnected",
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { provider: store.provider },
  });
  revalidatePath("/commerce/stores");
  redirect("/commerce/stores?disconnected=1");
}

export async function startStoreSyncAction(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const limit = await rateLimit("store-sync-start", 20, 60 * 60);
  if (!limit.allowed) return { error: limit.message };

  const parsed = storeSyncSchema.safeParse({
    storeId: formData.get("storeId"),
    requestedRange: formData.get("requestedRange"),
  });
  if (!parsed.success) return { error: "Choose a valid store and order history range." };

  const [store] = await db.select().from(stores)
    .where(and(eq(stores.id, parsed.data.storeId), eq(stores.workspaceId, workspace.id), eq(stores.status, "CONNECTED")))
    .limit(1);
  if (!store?.encryptedCredentials) return { error: "This store is not connected to the active workspace." };

  let credentials;
  try {
    credentials = decryptStoreCredentials(store.encryptedCredentials);
  } catch {
    return { error: "Store credentials could not be decrypted. Reconnect this store." };
  }
  if (credentials.provider !== store.provider) return { error: "Store credentials do not match the provider." };
  if (
    credentials.provider === "SHOPIFY" &&
    parsed.data.requestedRange !== "LAST_30_DAYS" &&
    !credentials.scopes.includes("read_all_orders")
  ) {
    return { error: "Shopify requires approved read_all_orders access to sync orders older than 60 days." };
  }

  const [activeJob] = await db.select({ id: storeSyncJobs.id }).from(storeSyncJobs)
    .where(and(
      eq(storeSyncJobs.storeId, store.id),
      inArray(storeSyncJobs.status, ["PENDING", "RUNNING"])
    ))
    .limit(1);
  if (activeJob) return { error: "A sync is already running for this store." };

  try {
    const rangeStartedAt = parsed.data.requestedRange === "ALL_HISTORY"
      ? null
      : new Date(Date.now() - (parsed.data.requestedRange === "LAST_30_DAYS" ? 30 : 90) * 24 * 60 * 60 * 1000);
    await db.insert(storeSyncJobs).values({
      workspaceId: workspace.id,
      storeId: store.id,
      requestedRange: parsed.data.requestedRange,
      rangeStartedAt,
    });
  } catch {
    return { error: "A sync was just started for this store. Refresh to see its status." };
  }

  await recordAuditLog({
    action: "store.sync.requested",
    userId: user.id,
    workspaceId: workspace.id,
    metadata: { storeId: store.id, provider: store.provider, range: parsed.data.requestedRange },
  });
  revalidatePath("/commerce/stores");
  return { success: "Store sync queued. Products and orders will appear as pages are processed." };
}