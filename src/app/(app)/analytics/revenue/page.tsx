import { DollarSign } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export default function RevenueAnalyticsPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Revenue</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Revenue attribution across campaigns and automations.</p>
      </div>
      <ComingSoon
        icon={DollarSign}
        title="Coming soon"
        description="Revenue attribution requires a connected store — this will populate once the Commerce integrations module is built."
      />
    </div>
  );
}
