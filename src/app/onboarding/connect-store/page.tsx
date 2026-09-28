import { Store } from "lucide-react";
import { OnboardingCard } from "@/components/onboarding/onboarding-card";
import { completeOnboardingAction } from "@/lib/actions/onboarding-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const platforms = ["Shopify", "WooCommerce", "BigCommerce", "Wix", "Magento", "PrestaShop"];

export default function ConnectStorePage() {
  return (
    <OnboardingCard
      activeStep={2}
      title="Connect your store"
      subtitle="Sync customers, orders, and products automatically. You can also do this later."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          {platforms.map((platform) => (
            <button
              key={platform}
              type="button"
              disabled
              className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border px-3.5 py-3 text-left text-[13px] font-medium text-text-tertiary opacity-70"
            >
              <Store size={16} />
              <span className="flex-1">{platform}</span>
              <Badge tone="neutral">Soon</Badge>
            </button>
          ))}
        </div>

        <form action={completeOnboardingAction}>
          <Button type="submit" variant="secondary" className="w-full">
            Skip for now
          </Button>
        </form>
      </div>
    </OnboardingCard>
  );
}
