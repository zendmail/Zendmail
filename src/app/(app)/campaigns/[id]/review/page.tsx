import { notFound, redirect } from "next/navigation";
import { ShieldAlert, Clock3, Gauge } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CampaignWizardSteps } from "@/components/campaigns/campaign-wizard-steps";
import { EmailPreview } from "@/components/campaigns/email-preview";
import { TestEmailForm } from "@/components/campaigns/test-email-form";
import { SendCampaignButton } from "@/components/campaigns/send-campaign-button";
import { ScheduleForm } from "@/components/campaigns/schedule-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getCampaignById, countSendableAudience } from "@/lib/campaigns";
import { getSendTimeInsight } from "@/lib/send-time-insight";
import { sendCampaignNowAction } from "@/lib/actions/campaign-actions";
import { resolveSender } from "@/lib/email";
import { getVerifiedDomainNames } from "@/lib/sending-domains/service";
import { formatNumber } from "@/lib/utils";
import type { EmailBlock } from "@/db/schema";

export default async function CampaignReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { sendError } = await searchParams;
  const sendErrorMessage = typeof sendError === "string" ? sendError.slice(0, 300) : null;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const campaign = await getCampaignById(workspace.id, id);
  if (!campaign) notFound();

  const [audience, sendTime] = await Promise.all([
    countSendableAudience(workspace.id, {
      audienceType: campaign.audienceType,
      segmentId: campaign.segmentId,
    }),
    getSendTimeInsight(workspace.id),
  ]);
  const sendableCount = audience.sendable.length;
  const totalSkipped = audience.skippedFrequencyCap + audience.skippedPaused;

  const sender = resolveSender({
    fromName: campaign.fromName,
    fromEmail: campaign.fromEmail,
    replyTo: campaign.replyTo,
    verifiedDomains: await getVerifiedDomainNames(workspace.id),
  });

  const blocks = campaign.blocks as EmailBlock[];
  const isDraft = campaign.status === "DRAFT";

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <CampaignWizardSteps campaignId={id} active="review" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[13.5px]">
              <div className="flex justify-between">
                <span className="text-text-secondary">Campaign</span>
                <span className="font-medium text-text-primary">{campaign.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">From</span>
                <span className="font-medium text-text-primary">
                  {campaign.fromName} &lt;{campaign.fromEmail}&gt;
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-text-secondary">Recipients see</span>
                <span className="break-all text-right font-medium text-text-primary">{sender.from}</span>
              </div>
              {sender.mode === "shared" && (
                <p className="rounded-[10px] bg-warning-surface px-3 py-2 text-[12px] leading-[1.5] text-warning">
                  This address isn&apos;t on a verified domain, so the email goes out from Zendmail&apos;s shared address
                  {sender.replyTo ? <> and replies go to <strong>{sender.replyTo}</strong></> : null}.{" "}
                  <Link href="/workspace/domains" className="font-semibold underline">Verify your domain</Link> to send from your own address.
                </p>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">Subject</span>
                <span className="font-medium text-text-primary">{campaign.subject || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Audience</span>
                <span className="font-medium text-text-primary">
                  {campaign.audienceType === "ALL" ? "All contacts" : "Segment"}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-text-secondary">Will send to</span>
                <span className="font-semibold text-text-primary">{formatNumber(sendableCount)} contacts</span>
              </div>
              <p className="flex items-start gap-1.5 text-[12px] text-text-tertiary pt-1">
                <ShieldAlert size={13} className="mt-0.5 shrink-0" />
                Estimated from consented, non-suppressed contacts — the exact count is recalculated at send time.
              </p>
            </CardContent>
          </Card>

          {totalSkipped > 0 && (
            <Card className="border-warning-surface bg-warning-surface/30 p-4">
              <p className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
                <Gauge size={15} className="text-warning" />
                Send Frequency Guard held back {formatNumber(totalSkipped)} contact{totalSkipped === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-[12.5px] text-text-secondary">
                {audience.skippedFrequencyCap > 0 &&
                  `${formatNumber(audience.skippedFrequencyCap)} already received their weekly email limit from other campaigns. `}
                {audience.skippedPaused > 0 &&
                  `${formatNumber(audience.skippedPaused)} have temporarily paused emails via the unsubscribe preference center. `}
                This protects your sender reputation and their inbox — not a bug.
              </p>
            </Card>
          )}

          {sendTime.hasData && (
            <Card className="border-primary-surface bg-primary-surface/30 p-4">
              <p className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
                <Clock3 size={15} className="text-primary" />
                Best time to send: {sendTime.bestHourLabel}
              </p>
              <p className="mt-1 text-[12.5px] text-text-secondary">
                Based on {formatNumber(sendTime.sampleSize)} opens across your past campaigns, your contacts open
                emails most around this time.
              </p>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Send yourself a test</CardTitle>
                <CardDescription>Test emails don&apos;t count as a send.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <TestEmailForm campaignId={id} defaultEmail={user.email} />
            </CardContent>
          </Card>

          {isDraft ? (
            <Card>
              <CardHeader>
                <CardTitle>Send</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sendErrorMessage && (
                  <p role="alert" className="rounded-[10px] bg-danger-surface px-3 py-2.5 text-[13px] text-danger">
                    {sendErrorMessage}
                  </p>
                )}
                <form action={sendCampaignNowAction}>
                  <input type="hidden" name="campaignId" value={id} />
                  <SendCampaignButton
                    count={formatNumber(sendableCount)}
                    disabled={!campaign.subject || sendableCount === 0}
                  />
                </form>
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-[13px] font-medium text-text-primary">Or schedule for later</p>
                  <ScheduleForm campaignId={id} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="text-[13.5px] text-text-secondary">
                This campaign is <strong className="text-text-primary">{campaign.status.toLowerCase()}</strong>.
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-2 lg:sticky lg:top-20 lg:self-start">
          <p className="text-[13px] font-medium text-text-secondary">Preview</p>
          <EmailPreview blocks={blocks} />
        </div>
      </div>
    </div>
  );
}
