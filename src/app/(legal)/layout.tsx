import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { legal } from "@/lib/legal";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[860px] items-center justify-between px-5 py-4">
          <Link href="/" aria-label="Zendmail home"><Logo height={26} priority /></Link>
          <Link href="/login" className="text-[13px] font-medium text-primary hover:underline">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[860px] px-5 py-10">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[12.5px] text-text-secondary">
          <span>&copy; {new Date().getFullYear()} {legal.company}</span>
          <nav aria-label="Legal" className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-text-primary">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-text-primary">Terms of Service</Link>
            <Link href="/acceptable-use" className="hover:text-text-primary">Acceptable Use &amp; Anti-Spam</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
