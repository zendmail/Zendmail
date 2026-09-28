import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignWizardSteps } from "@/components/campaigns/campaign-wizard-steps";
import { AudienceForm } from "@/components/campaigns/audience-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getCampaignById } from "@/lib/campaigns";
import { listSegmentsWithCounts } from "@/lib/segments";
import { getWorkspaceContactCounts } from "@/lib/contacts";

export default async function CampaignAudiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const campaign = await getCampaignById(workspace.id, id);
  if (!campaign) notFound();

  const [segments, contactCounts] = await Promise.all([
    listSegmentsWithCounts(workspace.id),
    getWorkspaceContactCounts(workspace.id),
  ]);

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <CampaignWizardSteps campaignId={id} active="audience" />
      <Card>
        <CardHeader>
          <CardTitle>Who should receive this campaign?</CardTitle>
        </CardHeader>
        <CardContent>
          <AudienceForm
            campaignId={id}
            segments={segments.map((s) => ({ id: s.id, name: s.name, contactCount: s.contactCount }))}
            initialType={campaign.audienceType}
            initialSegmentId={campaign.segmentId}
            allContactsCount={contactCounts.total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
