import { SkeletonPageHeader, SkeletonTable } from "@/components/ui/skeleton";

export default function ContactsLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <SkeletonPageHeader />
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}
