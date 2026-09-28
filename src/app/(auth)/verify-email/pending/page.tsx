import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions/auth-actions";

export default async function VerifyEmailPendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/onboarding/create");

  return (
    <AuthCard title="Check your inbox" subtitle={`We sent a verification link to ${user.email}.`}>
      <div className="flex flex-col items-center gap-5 text-center">
        <MailCheck size={36} className="text-primary" />
        <p className="text-[13.5px] text-text-secondary">
          Click the link in that email to verify your address and continue setting up your workspace.
        </p>
        <ResendVerificationForm />
        <form action={logoutAction}>
          <button type="submit" className="text-[13px] text-text-tertiary hover:text-text-secondary">
            Sign out
          </button>
        </form>
      </div>
    </AuthCard>
  );
}
