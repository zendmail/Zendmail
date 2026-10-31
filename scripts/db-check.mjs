// Shows which database migrations are applied to the database in DATABASE_URL, without changing anything.
//   PowerShell:  $env:DATABASE_URL = Read-Host "DATABASE_URL"   (paste with right-click, then Enter)
//                node scripts/db-check.mjs
// It prints only the database host (never the password) so you can confirm you are looking at production.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run the Read-Host line first (see the comment at the top of this file).");
  process.exit(1);
}

let host = "unknown";
try {
  host = new URL(url).host;
} catch {
  console.error("DATABASE_URL is not a valid URL (check for extra characters from pasting).");
  process.exit(1);
}
console.log(`Database host: ${host}\n`);

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const client = new pg.Client({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });

try {
  await client.connect();
  const exists = await client.query("select to_regclass('drizzle.__drizzle_migrations') as t");
  if (!exists.rows[0].t) {
    console.log("No drizzle.__drizzle_migrations table: no migration has ever been recorded here.");
    process.exit(0);
  }
  const { rows } = await client.query("select hash, created_at from drizzle.__drizzle_migrations");
  const applied = new Set(rows.map((r) => r.hash));
  console.log(`${rows.length} migrations recorded in the database, ${journal.entries.length} in the code.\n`);

  let missing = 0;
  for (const entry of journal.entries) {
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");
    const ok = applied.has(hash);
    if (!ok) missing++;
    console.log(`${ok ? "applied " : "MISSING "} ${entry.tag}`);
  }
  console.log(missing === 0 ? "\nAll migrations are applied." : `\n${missing} migration(s) are missing. Run them in the Neon SQL Editor (the .sql files from the patches) or with: npm run db:migrate`);
} catch (error) {
  console.error("Could not check:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
