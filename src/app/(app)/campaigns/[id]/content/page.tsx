import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CampaignWizardSteps } from "@/components/campaigns/campaign-wizard-steps";
import { TemplatePicker } from "@/components/campaigns/template-picker";
import { ContentDetailsForm } from "@/components/campaigns/content-details-form";
import { BlockEditor } from "@/components/campaigns/block-editor";
import { EmailPreview } from "@/components/campaigns/email-preview";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getCampaignById } from "@/lib/campaigns";
import { getVerifiedDomainNames } from "@/lib/sending-domains/service";
import { db } from "@/db/client";
import { emailTemplates, type EmailBlock } from "@/db/schema";
import { eq, isNull, or } from "drizzle-orm";

export default async function CampaignContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const campaign = await getCampaignById(workspace.id, id);
  if (!campaign) notFound();

  const templates = await db
    .select({
      id: emailTemplates.id,
      name: emailTemplates.name,
      category: emailTemplates.category,
      subject: emailTemplates.subject,
      previewText: emailTemplates.previewText,
      blocks: emailTemplates.blocks,
    })
    .from(emailTemplates)
    .where(or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id)));

  const blocks = campaign.blocks as EmailBlock[];

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <CampaignWizardSteps campaignId={id} active="content" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Start from a template</CardTitle>
                <CardDescription>Applying a template replaces the current content below.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <TemplatePicker campaignId={id} templates={templates} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign details</CardTitle>
            </CardHeader>
            <CardContent>
              <ContentDetailsForm campaign={campaign} verifiedDomains={await getVerifiedDomainNames(workspace.id)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email content</CardTitle>
            </CardHeader>
            <CardContent>
              <BlockEditor campaignId={id} blocks={blocks} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <p className="text-[13px] font-medium text-text-secondary">Live preview</p>
          <EmailPreview blocks={blocks} />
          <div className="flex justify-end">
            <Link href={`/campaigns/${id}/review`}>
              <Button>Continue to review</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
