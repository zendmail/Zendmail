import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";

// The visual editor runs full-screen (no app sidebar) but keeps exactly the same access rules as the app.
const stepToPath: Record<string, string> = {
  BUSINESS_INFO: "/onboarding/business-info",
  USE_CASE: "/onboarding/use-case",
  CONNECT_STORE: "/onboarding/connect-store",
};

export const metadata = { title: "Editor", robots: { index: false } };

export default async function BuilderLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerifiedAt) redirect("/verify-email/pending");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  if (workspace.onboardingStep !== "COMPLETE") redirect(stepToPath[workspace.onboardingStep] ?? "/onboarding/business-info");
  return <>{children}</>;
}
