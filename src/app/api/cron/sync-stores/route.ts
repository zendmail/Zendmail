import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { processStoreSyncJobs } from "@/lib/store-sync";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processStoreSyncJobs();
    return NextResponse.json({ ok: true, processed });
  } catch {
    console.error("store-sync cron failed");
    return NextResponse.json({ ok: false, error: "Store sync worker failed." }, { status: 500 });
  }
}