import { Logo } from "@/components/ui/logo";

const steps = ["Business info", "Use case", "Connect store"];

export function OnboardingCard({
  title,
  subtitle,
  activeStep,
  children,
}: {
  title: string;
  subtitle?: string;
  activeStep: number; // 0-indexed
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[480px]">
        <div className="mb-8 flex items-center justify-center gap-1.5">
          <Logo height={32} className="max-w-[218px]" />
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={
                  idx <= activeStep
                    ? "h-1.5 w-10 rounded-full bg-primary"
                    : "h-1.5 w-10 rounded-full bg-surface-secondary"
                }
              />
            </div>
          ))}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-7 shadow-[var(--shadow-sm)]">
          <p className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">
            Step {activeStep + 1} of {steps.length}
          </p>
          <h1 className="mt-1 text-[19px] font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13.5px] text-text-secondary">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-[11.5px] text-text-tertiary">Powered by Zoraak Technologies</p>
      </div>
    </div>
  );
}
