import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
