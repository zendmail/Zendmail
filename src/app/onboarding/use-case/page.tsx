import { OnboardingCard } from "@/components/onboarding/onboarding-card";
import { UseCaseForm } from "@/components/onboarding/use-case-form";

export default function UseCasePage() {
  return (
    <OnboardingCard
      activeStep={1}
      title="What best describes you?"
      subtitle="We'll tailor your dashboard and starter templates to this."
    >
      <UseCaseForm />
    </OnboardingCard>
  );
}
