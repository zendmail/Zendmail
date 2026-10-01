import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trash2, Mail, Phone, ShieldCheck, ShieldOff, ShieldQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ContactStatusBadge } from "@/components/ui/badge";
import { EditContactForm } from "@/components/contacts/edit-contact-form";
import { TagManager } from "@/components/contacts/tag-manager";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { getContactById } from "@/lib/contacts";
import { getDigitalCustomerSummary } from "@/lib/digital-commerce";
import { deleteContactAction } from "@/lib/actions/contact-actions";
import { formatCurrency } from "@/lib/utils";

const consentDisplay: Record<string, { label: string; icon: typeof ShieldCheck; tone: string }> = {
  GRANTED: { label: "Consent granted", icon: ShieldCheck, tone: "text-success" },
  WITHDRAWN: { label: "Consent withdrawn", icon: ShieldOff, tone: "text-danger" },
  NOT_PROVIDED: { label: "Consent not provided", icon: ShieldQuestion, tone: "text-text-tertiary" },
};

export default async function ContactProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const contact = await getContactById(workspace.id, id);
  if (!contact) notFound();

  const digitalSummary = await getDigitalCustomerSummary(workspace.id, contact.id);

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email;
  const consent = consentDisplay[contact.consentStatus] ?? consentDisplay.NOT_PROVIDED;
  const ConsentIcon = consent.icon;

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <Link href="/contacts" className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary">
        <ArrowLeft size={14} />
        Back to contacts
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-text-primary">{name}</h1>
            <ContactStatusBadge status={contact.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Mail size={13} /> {contact.email}
            </span>
            {contact.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={13} /> {contact.phone}
              </span>
            )}
            <span className={`flex items-center gap-1.5 ${consent.tone}`}>
              <ConsentIcon size={13} /> {consent.label}
            </span>
          </div>
        </div>
        <form action={deleteContactAction}>
          <input type="hidden" name="id" value={contact.id} />
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
          { label: "Total orders", value: contact.totalOrders.toString() },
          { label: "Total revenue", value: formatCurrency(Number(contact.totalSpent)) },
          {
            label: "Last purchase",
            value: contact.lastPurchaseAt ? new Date(contact.lastPurchaseAt).toLocaleDateString() : "—",
          },
          {
            label: "Engagement",
            value: contact.engagement ? `${contact.engagement.score}/100` : "Not enough data",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-[12px] text-text-secondary">{stat.label}</p>
            <p className="mt-1 text-[17px] font-semibold text-text-primary">{stat.value}</p>
          </Card>
        ))}
      </div>
      {contact.engagement && (
        <p className="text-[12px] text-text-tertiary">
          Engagement is calculated from {contact.engagement.sent} sent email
          {contact.engagement.sent === 1 ? "" : "s"} — {contact.engagement.opened} opened, {contact.engagement.clicked}{" "}
          clicked.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact details</CardTitle>
            </CardHeader>
            <CardContent>
              <EditContactForm
                contact={{
                  id: contact.id,
                  email: contact.email,
                  firstName: contact.firstName,
                  lastName: contact.lastName,
                  phone: contact.phone,
                  status: contact.status,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Digital purchases</CardTitle>
                <CardDescription>Products, subscriptions, and access status synced from a connected store</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {!digitalSummary.hasPurchases ? (
                <p className="rounded-[var(--radius-md)] border border-dashed border-border p-6 text-center text-[13px] text-text-tertiary">
                  No digital purchases yet.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-surface-secondary/60 p-3">
                    <span className="text-[13px] text-text-secondary">Total spent on digital products</span>
                    <span className="text-[15px] font-semibold text-text-primary">
                      {formatCurrency(digitalSummary.totalSpent)}
                    </span>
                  </div>
                  {digitalSummary.purchases.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-border pb-2.5 last:border-0">
                      <div>
                        <p className="text-[13px] font-medium text-text-primary">{p.productName}</p>
                        <p className="text-[11.5px] text-text-tertiary">{new Date(p.purchasedAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[13px] text-text-secondary">{formatCurrency(Number(p.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Activity timeline</CardTitle>
                <CardDescription>Campaign sends, opens, clicks, and orders</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="rounded-[var(--radius-md)] border border-dashed border-border p-6 text-center text-[13px] text-text-tertiary">
                Coming soon — this will populate once the Campaigns and Commerce modules are connected.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <TagManager contactId={contact.id} tags={contact.tags} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consent & source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-text-secondary">Consent status</span>
                <span className="font-medium text-text-primary">{contact.consentStatus.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Source</span>
                <span className="font-medium text-text-primary">{contact.consentSource ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Consented at</span>
                <span className="font-medium text-text-primary">
                  {contact.consentedAt ? new Date(contact.consentedAt).toLocaleDateString() : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Added</span>
                <span className="font-medium text-text-primary">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
