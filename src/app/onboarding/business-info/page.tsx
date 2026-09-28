import { OnboardingCard } from "@/components/onboarding/onboarding-card";
import { BusinessInfoForm } from "@/components/onboarding/business-info-form";

export default function BusinessInfoPage() {
  return (
    <OnboardingCard
      activeStep={0}
      title="Tell us about your business"
      subtitle="This helps us tailor templates, sending defaults, and currency formatting."
    >
      <BusinessInfoForm />
    </OnboardingCard>
  );
}
