"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Next.js error.tsx boundaries receive the real thrown error, but we
 * deliberately never render `error.message` or `error.stack` here —
 * that can leak internal details (query text, file paths, library
 * internals). The user gets a plain, honest message and a retry
 * button; the real detail goes to the server console (already logged
 * by whatever threw) for whoever's debugging it.
 */
export function ErrorState({ reset, compact = false }: { reset: () => void; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface py-14 text-center"
          : "flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center"
      }
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-surface">
        <AlertTriangle size={20} className="text-danger" />
      </div>
      <div>
        <p className="text-[14px] font-medium text-text-primary">Something went wrong</p>
        <p className="mt-1 max-w-sm text-[13px] text-text-secondary">
          This page hit an unexpected error. Try again, or come back in a moment.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={reset}>
        <RefreshCw size={14} />
        Try again
      </Button>
    </div>
  );
}
