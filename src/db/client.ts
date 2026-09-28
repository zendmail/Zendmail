import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __zendmailPool: Pool | undefined;
}

// Pool sizing matters once there's real concurrent traffic: too high and
// many app instances collectively exhaust Postgres' max_connections
// (typically 100-500 depending on plan); too low and requests queue up
// under load. DATABASE_POOL_MAX lets this be tuned per-deployment without
// a code change — see PRODUCTION_DEPLOYMENT.md for sizing guidance.
//
// If deploying to a serverless platform (Vercel, AWS Lambda) rather than
// a long-running container, point DATABASE_URL at your provider's pooled
// connection string (Neon: the "-pooler" host; Supabase: port 6543) —
// a raw `pg.Pool` per serverless invocation does not scale safely
// otherwise, since each cold start can open its own connection.
const pool =
  global.__zendmailPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    maxUses: 7_500, // recycle connections periodically to avoid long-lived connection drift
  });

if (process.env.NODE_ENV !== "production") {
  global.__zendmailPool = pool;
}

pool.on("error", (err) => {
  // A background idle client throwing (e.g. the DB restarting) must not
  // crash the whole process — log and let the pool replace the connection.
  console.error("Unexpected Postgres pool error:", err);
});

export const db = drizzle(pool, { schema });
