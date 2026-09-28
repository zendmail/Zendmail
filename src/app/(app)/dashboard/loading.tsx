import { SkeletonKpiGrid, SkeletonTable, Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-2 h-3.5 w-72" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <SkeletonKpiGrid />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
          <SkeletonTable rows={4} cols={4} />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
        </div>
      </div>
    </div>
  );
}
