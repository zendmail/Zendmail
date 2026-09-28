import Link from "next/link";
import { cn } from "@/lib/utils";

const steps = [
  { key: "audience", label: "Audience" },
  { key: "content", label: "Content" },
  { key: "review", label: "Review" },
] as const;

export function CampaignWizardSteps({
  campaignId,
  active,
}: {
  campaignId: string;
  active: (typeof steps)[number]["key"];
}) {
  const activeIndex = steps.findIndex((s) => s.key === active);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, idx) => (
        <Link
          key={step.key}
          href={idx <= activeIndex ? `/campaigns/${campaignId}/${step.key}` : "#"}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            step.key === active
              ? "border-primary bg-primary-surface text-primary"
              : idx < activeIndex
                ? "border-border text-text-secondary hover:bg-surface-secondary"
                : "border-border text-text-tertiary pointer-events-none opacity-60"
          )}
        >
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold",
              step.key === active ? "bg-primary text-primary-text-on" : "bg-surface-secondary text-text-tertiary"
            )}
          >
            {idx + 1}
          </span>
          {step.label}
        </Link>
      ))}
    </div>
  );
}
