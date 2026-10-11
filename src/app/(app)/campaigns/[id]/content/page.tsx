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
import { listSenderCandidates } from "@/lib/sending/domains";
import { isDomainSendable } from "@/lib/sending/rules";
import { db } from "@/db/client";
import { emailTemplates, type EmailBlock } from "@/db/schema";
import { asc, eq, isNull, or, sql } from "drizzle-orm";
import { ThemePanel } from "@/components/campaigns/theme-panel";
import { parseTheme } from "@/lib/email-builder/theme";

export default async function CampaignContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const verifiedSenders = (await listSenderCandidates(workspace.id)).filter((c) => isDomainSendable(c.domain));
  const campaign = await getCampaignById(workspace.id, id);
  if (!campaign) notFound();

  // Light list only (no block content): thumbnails are rendered on demand.
  const templates = await db
    .select({
      id: emailTemplates.id,
      name: emailTemplates.name,
      description: emailTemplates.description,
      category: emailTemplates.category,
      tier: emailTemplates.tier,
      subject: emailTemplates.subject,
    })
    .from(emailTemplates)
    .where(or(isNull(emailTemplates.workspaceId), eq(emailTemplates.workspaceId, workspace.id)))
    .orderBy(sql`(${emailTemplates.workspaceId} is not null)`, asc(emailTemplates.sortOrder), asc(emailTemplates.createdAt));
  const templateItems = templates.map((t) => ({ ...t, isBuiltIn: true }));
  const theme = parseTheme(campaign.theme);

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
              <TemplatePicker campaignId={id} templates={templateItems} planName={workspace.planName} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign details</CardTitle>
            </CardHeader>
            <CardContent>
              <ContentDetailsForm campaign={campaign} verifiedSenders={verifiedSenders} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ThemePanel campaignId={id} theme={theme} />
              <BlockEditor campaignId={id} blocks={blocks} theme={theme} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <p className="text-[13px] font-medium text-text-secondary">Live preview</p>
          <EmailPreview blocks={blocks} theme={campaign.theme} previewText={campaign.previewText} businessName={workspace.name} />
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
