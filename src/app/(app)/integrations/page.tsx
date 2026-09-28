import { Plug } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Integrations</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Connect the tools you already use.</p>
      </div>
      <ComingSoon
        icon={Plug}
        title="No integrations available yet"
        description="An integration marketplace (Shopify, WooCommerce, Zapier, and more) is planned for a future release."
      />
    </div>
  );
}
