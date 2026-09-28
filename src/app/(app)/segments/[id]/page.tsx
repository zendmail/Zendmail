import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trash2, Send, Workflow } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RuleSummary } from "@/components/segments/rule-summary";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getSegmentWithRules, listSegmentMatches } from "@/lib/segments";
import { deleteSegmentAction } from "@/lib/actions/segment-actions";
import { formatNumber } from "@/lib/utils";

export default async function SegmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const segment = await getSegmentWithRules(workspace.id, id);
  if (!segment) notFound();

  const matches = await listSegmentMatches(workspace.id, segment.rules, segment.matchType, 25);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Link
        href="/segments"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to segments
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-text-primary">{segment.name}</h1>
          {segment.description && <p className="mt-1 text-[13.5px] text-text-secondary">{segment.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled title="Coming soon — requires the Campaigns module">
            <Send size={14} />
            Create campaign
          </Button>
          <Button variant="secondary" size="sm" disabled title="Coming soon — requires the Automations module">
            <Workflow size={14} />
            Create automation
          </Button>
          <form action={deleteSegmentAction}>
            <input type="hidden" name="id" value={segment.id} />
            <button
              type="submit"
              className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-border px-3 text-[13px] font-medium text-danger hover:bg-danger-surface"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </form>
        </div>
      </div>

      <Card className="p-5">
        <p className="mb-3 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">
          Matches {segment.matchType === "ALL" ? "all" : "any"} of these conditions
        </p>
        <RuleSummary rules={segment.rules} matchType={segment.matchType} />
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{formatNumber(matches.length)}+ contacts found</CardTitle>
            <CardDescription>Showing up to 25 — audience size updates live as contacts change.</CardDescription>
          </div>
        </CardHeader>
        <ContactsTable contacts={matches} />
      </Card>
    </div>
  );
}
