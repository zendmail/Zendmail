import { Skeleton, SkeletonKpiGrid } from "@/components/ui/skeleton";

export default function ContactDetailLoading() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <Skeleton className="h-3.5 w-32" />
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-3.5 w-64" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <SkeletonKpiGrid />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)] lg:col-span-2" />
        <Skeleton className="h-72 w-full rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}
