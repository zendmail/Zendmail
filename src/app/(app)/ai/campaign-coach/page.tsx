import { MessagesSquare } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export default function CampaignCoachPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Campaign Coach</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          Predictive recommendations for send times, subject lines, and audiences.
        </p>
      </div>
      <ComingSoon
        icon={MessagesSquare}
        title="Coming soon"
        description="Campaign Coach is a V3 feature that relies on historical performance data across many campaigns — it will unlock as you send more."
      />
    </div>
  );
}
