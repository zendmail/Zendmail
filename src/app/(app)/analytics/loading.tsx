import { SkeletonKpiGrid, Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-3.5 w-64" />
      </div>
      <SkeletonKpiGrid />
      <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}
