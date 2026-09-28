import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-1.5">
          <Logo height={32} className="max-w-[218px]" />
        </Link>

        <div className="rounded-[20px] border border-border bg-surface p-7 shadow-[0_16px_40px_rgb(11_22_51/0.07)] sm:p-8">
          <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.035em] text-text-primary">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] font-medium leading-6 text-text-secondary">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-5 text-center text-[13.5px] text-text-secondary">{footer}</div>}
        <p className="mt-6 text-center text-[11.5px] text-text-tertiary">Powered by Zoraak Technologies</p>
      </div>
    </div>
  );
}
