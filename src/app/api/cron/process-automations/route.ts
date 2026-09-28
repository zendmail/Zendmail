import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { processDueRunsGlobal } from "@/lib/automation-engine";

// Scheduled via vercel.json (see PRODUCTION_DEPLOYMENT.md) to run every
// minute. Idempotent and safe to run concurrently or more often than
// scheduled — advanceRun() only acts on runs whose nextRunAt has passed.
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processDueRunsGlobal();
    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("process-automations cron failed:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
