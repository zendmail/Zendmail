import Link from "next/link";
import { Plus, Users2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { listSegmentsWithCounts } from "@/lib/segments";
import { formatNumber } from "@/lib/utils";

export default async function SegmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const segments = await listSegmentsWithCounts(workspace.id);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Segments</h1>
          <p className="mt-1 text-[13.5px] text-text-secondary">
            Dynamic audiences built from contact, commerce, and engagement data.
          </p>
        </div>
        <Link href="/segments/new">
          <Button>
            <Plus size={15} />
            Create segment
          </Button>
        </Link>
      </div>

      {segments.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <Users2 size={28} className="text-text-tertiary" />
          <p className="text-[14px] font-medium text-text-primary">No segments yet</p>
          <p className="max-w-sm text-[13px] text-text-secondary">
            Build your first segment — for example, customers who spent over $200 and haven&apos;t purchased in 60
            days.
          </p>
          <Link href="/segments/new" className="mt-2">
            <Button size="sm">Create your first segment</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <Link key={segment.id} href={`/segments/${segment.id}`}>
              <Card className="h-full p-5 hover:border-border-strong transition-colors">
                <p className="text-[15px] font-semibold text-text-primary">{segment.name}</p>
                {segment.description && (
                  <p className="mt-1 text-[13px] text-text-secondary line-clamp-2">{segment.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[22px] font-semibold text-text-primary">
                    {formatNumber(segment.contactCount)}
                  </span>
                  <span className="text-[12px] text-text-tertiary">
                    {segment.ruleCount} condition{segment.ruleCount === 1 ? "" : "s"}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
