import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignStatusBadge } from "@/components/ui/badge";
import { EmailPreview } from "@/components/campaigns/email-preview";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getCampaignById } from "@/lib/campaigns";
import { deleteCampaignAction } from "@/lib/actions/campaign-actions";
import { formatNumber } from "@/lib/utils";
import type { EmailBlock } from "@/db/schema";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const campaign = await getCampaignById(workspace.id, id);
  if (!campaign) notFound();

  if (campaign.status === "DRAFT") redirect(`/campaigns/${id}/audience`);

  const blocks = campaign.blocks as EmailBlock[];

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to campaigns
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-text-primary">{campaign.name}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <form action={deleteCampaignAction}>
          <input type="hidden" name="id" value={campaign.id} />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-[13px] font-medium text-danger hover:bg-danger-surface"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Recipients", value: formatNumber(campaign.recipientCount) },
          { label: "Subject", value: campaign.subject || "—" },
          {
            label: campaign.status === "SCHEDULED" ? "Scheduled for" : "Sent at",
            value: campaign.sentAt
              ? new Date(campaign.sentAt).toLocaleString()
              : campaign.scheduledAt
                ? new Date(campaign.scheduledAt).toLocaleString()
                : "—",
          },
          { label: "From", value: `${campaign.fromName}` },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-[12px] text-text-secondary">{stat.label}</p>
            <p className="mt-1 truncate text-[14px] font-semibold text-text-primary">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email content</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailPreview blocks={blocks} />
        </CardContent>
      </Card>
    </div>
  );
}
