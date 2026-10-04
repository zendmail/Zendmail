import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthStatusBadge, DmarcBadge } from "@/components/sending/status-badge";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getSendingHealth, listSendingDomains } from "@/lib/sending/domains";
import { formatNumber } from "@/lib/utils";

const NOT_ENOUGH = "Not enough data yet.";
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

export default async function SendingHealthPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const [domains, health] = await Promise.all([listSendingDomains(workspace.id), getSendingHealth(workspace.id)]);
  // Rates are only trustworthy if provider events actually reach us.
  const rates = health.webhookReceivingEvents && health.rates.sufficient ? health.rates : null;

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Sending Health</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Last 30 days, from messages and provider events Zendmail actually recorded.</p>
      </div>

      {!health.webhookReceivingEvents ? (
        <Card>
          <CardContent>
            <p className="text-[13px] text-text-secondary">
              <strong className="text-text-primary">No delivery events received yet.</strong> Bounce, complaint and delivery rates stay blank until the
              provider webhook (<code>/api/webhooks/resend</code>) is configured and reports its first event.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Domain authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {domains.length === 0 ? (
            <p className="text-[13px] text-text-secondary">No sending domains added yet.</p>
          ) : (
            domains.map((d) => (
              <div key={d.id} className="space-y-2">
                <p className="break-all text-[13.5px] font-semibold text-text-primary">{d.domain}</p>
                <div className="flex flex-wrap gap-2 text-[12.5px]">
                  <span className="flex items-center gap-1.5">DKIM <AuthStatusBadge status={d.dkimStatus} /></span>
                  <span className="flex items-center gap-1.5">SPF <AuthStatusBadge status={d.spfStatus} /></span>
                  <span className="flex items-center gap-1.5">DMARC <DmarcBadge status={d.dmarcStatus} policy={d.dmarcPolicy} /></span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Sending volume" value={formatNumber(health.counts.sent)} />
        <Stat label="Suppressed addresses" value={formatNumber(health.suppressedTotal)} />
        <Stat label="Delivery rate" value={rates?.deliveryRate != null ? pct(rates.deliveryRate) : NOT_ENOUGH} />
        <Stat label="Bounce rate" value={rates ? pct(rates.bounceRate) : NOT_ENOUGH} />
        <Stat label="Complaint rate" value={rates ? pct(rates.complaintRate) : NOT_ENOUGH} />
        <Stat label="Unsubscribe rate" value={health.rates.sufficient ? pct(health.rates.unsubscribeRate) : NOT_ENOUGH} />
      </div>
      <p className="text-[12px] text-text-secondary">
        Rates need at least 100 sends in the window. No overall &quot;domain health score&quot; is shown — Zendmail has no reliable data source for one.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-[12px] text-text-secondary">{label}</p>
        <p className="mt-1 text-[16px] font-bold text-text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}
