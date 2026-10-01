import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { sendingDomains, sendingIdentities } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { SendingDomainsSection } from "@/components/workspace/sending-domains-section";

export default async function SendingDomainsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const domains = await db
    .select()
    .from(sendingDomains)
    .where(and(eq(sendingDomains.workspaceId, workspace.id), isNull(sendingDomains.deletedAt)))
    .orderBy(sendingDomains.createdAt);

  const identities = await db
    .select()
    .from(sendingIdentities)
    .where(and(eq(sendingIdentities.workspaceId, workspace.id)))
    .orderBy(sendingIdentities.createdAt);

  return (
    <div className="mx-auto max-w-[820px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Sending Domains</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Authenticate your business domain before using it for outbound email.</p>
      </div>
      <SendingDomainsSection domains={domains} identities={identities} />
    </div>
  );
}
