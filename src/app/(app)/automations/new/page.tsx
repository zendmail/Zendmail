import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateAutomationForm } from "@/components/automations/create-automation-form";

export default function NewAutomationPage() {
  return (
    <div className="mx-auto max-w-[560px] space-y-4">
      <Link
        href="/automations"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to automations
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Create an automation</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateAutomationForm />
        </CardContent>
      </Card>
    </div>
  );
}
