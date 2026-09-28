import { Activity } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export default function AutomationAnalyticsPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Automation analytics</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Performance for your automated workflows.</p>
      </div>
      <ComingSoon
        icon={Activity}
        title="Coming soon"
        description="This will populate once the Automations module is built."
      />
    </div>
  );
}
