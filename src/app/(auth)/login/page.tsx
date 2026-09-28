import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your Zendmail workspace."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
