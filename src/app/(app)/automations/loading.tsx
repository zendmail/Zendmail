import { SkeletonPageHeader, SkeletonCardGrid } from "@/components/ui/skeleton";

export default function AutomationsLoading() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <SkeletonPageHeader />
      <SkeletonCardGrid count={3} />
    </div>
  );
}
