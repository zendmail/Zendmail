import Link from "next/link";
import { Wand2 } from "lucide-react";
import { ComingSoon } from "@/components/analytics/coming-soon";
import { Button } from "@/components/ui/button";

export default function AudienceBuilderPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">AI Audience Builder</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          Describe an audience in plain language and get a segment.
        </p>
      </div>
      <ComingSoon
        icon={Wand2}
        title="Coming soon"
        description={`Natural-language segment creation ("customers who spent over $100 and haven't purchased in 90 days") is planned for V2. You can build the same segment today using the rule-based builder.`}
      />
      <div className="flex justify-center">
        <Link href="/segments/new">
          <Button variant="secondary">Use the segment builder instead</Button>
        </Link>
      </div>
    </div>
  );
}
