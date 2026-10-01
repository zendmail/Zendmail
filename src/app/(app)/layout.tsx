import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { AppShell } from "@/components/layout/app-shell";

const stepToPath: Record<string, string> = {
  BUSINESS_INFO: "/onboarding/business-info",
  USE_CASE: "/onboarding/use-case",
  CONNECT_STORE: "/onboarding/connect-store",
};

export default async function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerifiedAt) redirect("/verify-email/pending");

  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  if (workspace.onboardingStep !== "COMPLETE") {
    redirect(stepToPath[workspace.onboardingStep] ?? "/onboarding/business-info");
  }

  return (
    <AppShell workspaceName={workspace.name} planName={workspace.planName} userName={user.name}>
      {children}
    </AppShell>
  );
}
