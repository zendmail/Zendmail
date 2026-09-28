import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { verifyEmailToken } from "@/lib/actions/auth-actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : { ok: false as const };

  if (result.ok) {
    return (
      <AuthCard title="Email verified">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="auth-verification-mark">
            <CheckCircle2 size={36} className="text-success" />
          </div>
          <p className="text-[13.5px] text-text-secondary">
            Your email is confirmed. Let&apos;s set up your workspace.
          </p>
          <Link href="/onboarding/create" className="w-full">
            <Button className="w-full">Continue</Button>
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Link expired or invalid">
      <div className="flex flex-col items-center gap-4 text-center">
        <XCircle size={36} className="text-danger" />
        <p className="text-[13.5px] text-text-secondary">
          This verification link has expired or was already used.
        </p>
        <Link href="/verify-email/pending" className="w-full">
          <Button variant="secondary" className="w-full">
            Request a new link
          </Button>
        </Link>
      </div>
    </AuthCard>
  );
}
