import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { workspaces } from "@/db/schema";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48) || "workspace";
}

/** Appends a numeric suffix until the slug is unique. */
export async function generateUniqueWorkspaceSlug(name: string) {
  const base = slugify(name);
  let candidate = base;
  let attempt = 1;

  while (true) {
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, candidate))
      .limit(1);

    if (!existing) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}
