import { UserRound } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export default function CommerceCustomersPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Customers</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Customer profiles synced from your connected stores.</p>
      </div>
      <ComingSoon
        icon={UserRound}
        title="No connected store yet"
        description="This view populates once a store is connected. In the meantime, your contacts (including anyone with orders imported via CSV) are managed under Audience → Contacts."
      />
    </div>
  );
}
