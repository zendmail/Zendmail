import { MousePointerClick } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export default function LandingPagesPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Landing Pages</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Standalone pages for campaigns and promotions.</p>
      </div>
      <ComingSoon
        icon={MousePointerClick}
        title="Landing page builder not built yet"
        description="A hosted landing page builder is planned for a future release."
      />
    </div>
  );
}
