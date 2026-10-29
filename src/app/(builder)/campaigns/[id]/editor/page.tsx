import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getCampaignById } from "@/lib/campaigns";
import { parseTheme } from "@/lib/email-builder/theme";
import { Builder } from "@/components/builder/builder";

export default async function CampaignEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  const campaign = await getCampaignById(workspace.id, id);
  if (!campaign || campaign.deletedAt) notFound();
  // Sent / scheduled campaigns are a record of what went out.
  if (campaign.status !== "DRAFT") redirect(`/campaigns/${campaign.id}`);

  return (
    <Builder
      key={`${campaign.id}:${campaign.contentRevision}`}
      kind="campaign"
      id={campaign.id}
      name={campaign.name}
      initialDoc={{ blocks: campaign.blocks, theme: parseTheme(campaign.theme) }}
      initialRevision={campaign.contentRevision}
      backHref={`/campaigns/${campaign.id}/content`}
      doneHref={`/campaigns/${campaign.id}/content`}
      doneLabel="Done"
    />
  );
}
