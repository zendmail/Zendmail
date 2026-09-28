import { SkeletonPageHeader, SkeletonTable } from "@/components/ui/skeleton";

export default function CampaignsLoading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <SkeletonPageHeader />
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
