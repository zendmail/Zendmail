import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentBuilder } from "@/components/segments/segment-builder";

export default function NewSegmentPage() {
  return (
    <div className="mx-auto max-w-[720px] space-y-4">
      <Link
        href="/segments"
        className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to segments
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Create a segment</CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentBuilder />
        </CardContent>
      </Card>
    </div>
  );
}
