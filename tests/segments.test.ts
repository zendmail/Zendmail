import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { buildSegmentCondition, type RuleInput } from "@/lib/segments";

const dialect = new PgDialect();
const workspaceId = "11111111-1111-1111-1111-111111111111";

function compileRules(rules: RuleInput[]) {
  const condition = buildSegmentCondition(workspaceId, rules, "ALL");
  if (!condition) throw new Error("Expected segment rules to produce a condition.");
  return dialect.sqlToQuery(condition);
}

describe("segment conditions", () => {
  it("builds numeric comparisons using the column's expected parameter types", () => {
    const query = compileRules([
      { field: "TOTAL_SPENT", operator: "GREATER_THAN", value: "50.25" },
      { field: "TOTAL_ORDERS", operator: "LESS_THAN", value: "3" },
    ]);

    expect(query.sql).toContain('"total_spent" >');
    expect(query.sql).toContain('"total_orders" <');
    expect(query.params).toContain("50.25");
    expect(query.params).toContain(3);
  });

  it("compares last-purchase dates to a relative day cutoff", () => {
    const query = compileRules([{ field: "LAST_PURCHASE_AT", operator: "BEFORE", value: "60" }]);

    expect(query.sql).toContain("last_purchase_at");
    expect(query.sql).toContain("now() - (");
    expect(query.params).toContain(60);
  });
});
