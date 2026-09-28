import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard title="Invalid reset link" subtitle="This password reset link is missing its token.">
        <p className="text-[13.5px] text-text-secondary">
          Request a new link from the forgot password page.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password" subtitle="Choose a new password for your account.">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
