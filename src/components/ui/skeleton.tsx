export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-sm)] bg-surface-secondary ${className}`} />;
}

export function SkeletonKpiGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-3 h-7 w-24" />
          <Skeleton className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface">
      <div className="border-b border-border p-4">
        <Skeleton className="h-8 w-full max-w-xs" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-5 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-3.5 ${c === 0 ? "w-40" : "w-16"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-3/4" />
          <Skeleton className="mt-4 h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-3.5 w-64" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
  );
}
