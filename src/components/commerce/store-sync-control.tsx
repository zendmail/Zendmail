"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startStoreSyncAction } from "@/lib/actions/store-actions";
import type { storeSyncJobs } from "@/db/schema";

type SyncJob = typeof storeSyncJobs.$inferSelect;

export function StoreSyncControl({
  storeId,
  provider,
  supportsExtendedHistory,
  job,
}: {
  storeId: string;
  provider: "SHOPIFY" | "WOOCOMMERCE";
  supportsExtendedHistory: boolean;
  job: SyncJob | null;
}) {
  const [state, formAction, pending] = useActionState(startStoreSyncAction, undefined);
  const router = useRouter();
  const isActive = job?.status === "PENDING" || job?.status === "RUNNING";

  useEffect(() => {
    if (!isActive) return;
    const timer = window.setInterval(() => router.refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, [isActive, router]);

  const statusLabel = job?.status === "PENDING"
    ? "Queued"
    : job?.status === "RUNNING"
      ? job.phase === "PRODUCTS" ? "Syncing products" : "Syncing orders"
      : job?.status === "COMPLETED"
        ? "Last sync complete"
        : job?.status === "FAILED"
          ? "Last sync failed"
          : "";

  return (
    <div className="mt-4 border-t border-border pt-3">
      {job && (
        <div aria-live="polite" className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className={`font-semibold ${job.status === "FAILED" ? "text-danger" : job.status === "COMPLETED" ? "text-success" : "text-text-primary"}`}>
            {isActive && <LoaderCircle size={13} className="mr-1 inline animate-spin" />}
            {statusLabel}
          </span>
          <span className="text-text-secondary">
            {job.productsSynced} products · {job.ordersSynced} orders
          </span>
          {job.lastError && <p className="w-full text-danger">{job.lastError}</p>}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input type="hidden" name="storeId" value={storeId} />
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[12px] font-medium text-text-secondary">Order history</span>
          <select
            name="requestedRange"
            defaultValue={supportsExtendedHistory ? "LAST_90_DAYS" : "LAST_30_DAYS"}
            disabled={pending || isActive}
            className="h-9 w-full rounded-[6px] border border-border bg-surface px-2.5 text-[13px] text-text-primary outline-none focus:border-primary disabled:opacity-60"
          >
            <option value="LAST_30_DAYS">Last 30 days</option>
            <option value="LAST_90_DAYS" disabled={provider === "SHOPIFY" && !supportsExtendedHistory}>Last 90 days</option>
            <option value="ALL_HISTORY" disabled={provider === "SHOPIFY" && !supportsExtendedHistory}>All history</option>
          </select>
        </label>
        <Button type="submit" size="sm" variant="secondary" disabled={pending || isActive}>
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {isActive ? "Sync in progress" : "Sync products & orders"}
        </Button>
      </form>

      {provider === "SHOPIFY" && !supportsExtendedHistory && (
        <p className="mt-2 text-[11px] leading-[1.45] text-text-tertiary">
          Shopify allows recent orders by default. Older history needs approved `read_all_orders` access.
        </p>
      )}
      {state?.error && <p role="alert" className="mt-2 text-[12px] text-danger">{state.error}</p>}
      {state?.success && <p role="status" className="mt-2 text-[12px] text-success">{state.success}</p>}
    </div>
  );
}