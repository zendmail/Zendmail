import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { emailTemplates } from "@/db/schema";
import { TEMPLATE_LIBRARY } from "./index";

/** Built-in templates that were replaced. Removed on sync; campaigns made from them keep their own copy of the content. */
const RETIRED_TEMPLATE_KEYS = ["seasonal-diwali", "seasonal-eid", "pro-festive-premium", "pro-eid-collection"];

/**
 * Installs / updates the built-in template library. Safe to run any number of times:
 *  - a template with a matching `key` is updated in place;
 *  - otherwise a legacy built-in with the same name (`replacesName`) is upgraded in place — keeping its id, so
 *    campaigns that were created from it keep their link;
 *  - otherwise a new row is inserted.
 * Workspace-owned templates are never touched.
 */
export async function syncBuiltInTemplates() {
  let inserted = 0;
  let updated = 0;

  await db.delete(emailTemplates).where(and(isNull(emailTemplates.workspaceId), inArray(emailTemplates.key, RETIRED_TEMPLATE_KEYS)));

  for (const def of TEMPLATE_LIBRARY) {
    const values = {
      key: def.key,
      name: def.name,
      description: def.description,
      category: def.category,
      tier: def.tier,
      sortOrder: def.sortOrder,
      subject: def.subject,
      previewText: def.previewText,
      blocks: def.blocks,
      theme: def.theme,
      updatedAt: new Date(),
    };

    const [byKey] = await db.select({ id: emailTemplates.id }).from(emailTemplates).where(and(isNull(emailTemplates.workspaceId), eq(emailTemplates.key, def.key))).limit(1);
    if (byKey) {
      await db.update(emailTemplates).set(values).where(eq(emailTemplates.id, byKey.id));
      updated += 1;
      continue;
    }

    if (def.replacesName) {
      const [legacy] = await db
        .select({ id: emailTemplates.id })
        .from(emailTemplates)
        .where(and(isNull(emailTemplates.workspaceId), isNull(emailTemplates.key), eq(emailTemplates.name, def.replacesName)))
        .limit(1);
      if (legacy) {
        await db.update(emailTemplates).set(values).where(eq(emailTemplates.id, legacy.id));
        updated += 1;
        continue;
      }
    }

    await db.insert(emailTemplates).values({ workspaceId: null, ...values });
    inserted += 1;
  }

  return { inserted, updated, total: TEMPLATE_LIBRARY.length };
}
