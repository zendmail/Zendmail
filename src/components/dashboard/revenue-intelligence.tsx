import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RevenueIllustration } from "@/components/dashboard/dashboard-illustrations";

export function RevenueIntelligence() {
  return (
    <Card className="dashboard-card">
      <CardHeader>
        <div>
          <CardTitle>Revenue Intelligence</CardTitle>
          <CardDescription>Store revenue, email-attributed revenue, and campaign/automation revenue.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-7 text-center">
          <RevenueIllustration />
          <div>
            <p className="text-[13.5px] font-medium text-text-primary">No revenue data yet</p>
            <p className="mt-1 max-w-sm text-[12.5px] text-text-secondary">
              Connect a store to unlock revenue attribution — Zendmail will start tracking your data.
            </p>
          </div>
          <Link href="/commerce/stores">
            <Button variant="secondary" size="sm">
              Connect store <span aria-hidden="true">→</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
