import "server-only";
import { and, or, eq, ne, gt, lt, isNull, isNotNull, sql, exists } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, contactTags, tags, segments, segmentRules } from "@/db/schema";

export type RuleInput = {
  field: (typeof segmentRules.$inferSelect)["field"];
  operator: (typeof segmentRules.$inferSelect)["operator"];
  value: string | null;
};

/**
 * Translates a single rule into a Drizzle SQL condition against the
 * contacts table. HAS_TAG is the only field that needs a subquery
 * (contact_tags join); everything else is a plain column comparison.
 */
function ruleToCondition(ruleInput: RuleInput) {
  const rule = { ...ruleInput, value: ruleInput.value ?? "" };
  switch (rule.field) {
    case "STATUS":
      return rule.operator === "NOT_EQUALS"
        ? ne(contacts.status, rule.value as (typeof contacts.$inferSelect)["status"])
        : eq(contacts.status, rule.value as (typeof contacts.$inferSelect)["status"]);

    case "CONSENT_STATUS":
      return rule.operator === "NOT_EQUALS"
        ? ne(contacts.consentStatus, rule.value as (typeof contacts.$inferSelect)["consentStatus"])
        : eq(contacts.consentStatus, rule.value as (typeof contacts.$inferSelect)["consentStatus"]);

    case "COUNTRY":
      return rule.operator === "NOT_EQUALS"
        ? or(ne(contacts.country, rule.value), isNull(contacts.country))
        : eq(contacts.country, rule.value);

    case "TOTAL_SPENT": {
      const n = Number(rule.value) || 0;
      return rule.operator === "LESS_THAN"
        ? lt(contacts.totalSpent, String(n))
        : gt(contacts.totalSpent, String(n));
    }

    case "TOTAL_ORDERS": {
      const n = Number(rule.value) || 0;
      return rule.operator === "LESS_THAN" ? lt(contacts.totalOrders, n) : gt(contacts.totalOrders, n);
    }

    case "LAST_PURCHASE_AT": {
      if (rule.operator === "IS_NULL") return isNull(contacts.lastPurchaseAt);
      if (rule.operator === "IS_NOT_NULL") return isNotNull(contacts.lastPurchaseAt);
      // BEFORE / AFTER a rolling "N days ago" cutoff, e.g. value="60" -> 60 days ago
      const days = Number(rule.value) || 0;
      const cutoff = sql`now() - (${days} || ' days')::interval`;
      return rule.operator === "BEFORE"
        ? sql`(${contacts.lastPurchaseAt} is null or ${contacts.lastPurchaseAt} < ${cutoff})`
        : gt(contacts.lastPurchaseAt, cutoff);
    }

    case "HAS_TAG": {
      const tagSubquery = db
        .select({ one: sql`1` })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(and(eq(contactTags.contactId, contacts.id), eq(tags.name, rule.value)));

      return rule.operator === "NOT_EQUALS" ? sql`not exists ${tagSubquery}` : exists(tagSubquery);
    }

    default:
      return sql`true`;
  }
}

export function buildSegmentCondition(
  workspaceId: string,
  rules: RuleInput[],
  matchType: "ALL" | "ANY"
) {
  const base = and(eq(contacts.workspaceId, workspaceId), sql`${contacts.deletedAt} is null`)!;
  if (rules.length === 0) return base;

  const ruleConditions = rules.map(ruleToCondition);
  const combined = matchType === "ANY" ? or(...ruleConditions) : and(...ruleConditions);

  return and(base, combined);
}

export async function countSegmentMatches(workspaceId: string, rules: RuleInput[], matchType: "ALL" | "ANY") {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(buildSegmentCondition(workspaceId, rules, matchType));
  return count;
}

export async function listSegmentMatches(
  workspaceId: string,
  rules: RuleInput[],
  matchType: "ALL" | "ANY",
  limit = 25
) {
  return db.select().from(contacts).where(buildSegmentCondition(workspaceId, rules, matchType)).limit(limit);
}

export async function listSegmentsWithCounts(workspaceId: string) {
  const rows = await db
    .select()
    .from(segments)
    .where(and(eq(segments.workspaceId, workspaceId), sql`${segments.deletedAt} is null`));

  const withCounts = await Promise.all(
    rows.map(async (segment) => {
      const rules = await db.select().from(segmentRules).where(eq(segmentRules.segmentId, segment.id));
      const count = await countSegmentMatches(workspaceId, rules, segment.matchType);
      return { ...segment, ruleCount: rules.length, contactCount: count };
    })
  );

  return withCounts;
}

export async function getSegmentWithRules(workspaceId: string, segmentId: string) {
  const [segment] = await db
    .select()
    .from(segments)
    .where(and(eq(segments.id, segmentId), eq(segments.workspaceId, workspaceId)))
    .limit(1);

  if (!segment) return null;

  const rules = await db.select().from(segmentRules).where(eq(segmentRules.segmentId, segmentId));
  return { ...segment, rules };
}
