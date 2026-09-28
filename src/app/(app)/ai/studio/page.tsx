import { AiStudio } from "@/components/ai/ai-studio";

export default function AiStudioPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">AI Studio</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          Describe the email you want in plain language — generate, refine, and turn it into a campaign.
        </p>
      </div>
      <AiStudio />
    </div>
  );
}
