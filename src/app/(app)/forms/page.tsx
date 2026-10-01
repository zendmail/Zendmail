import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";

export default function FormsPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Forms</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Signup forms to capture new contacts.</p>
      </div>
      <ComingSoon
        icon={FileText}
        title="Form builder not built yet"
        description="A drag-and-drop signup form builder with embeddable widgets is planned. Contacts can be added manually or via CSV import today."
      />
    </div>
  );
}
