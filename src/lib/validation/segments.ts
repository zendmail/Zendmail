import { z } from "zod";

export const segmentFieldValues = [
  "STATUS",
  "TOTAL_SPENT",
  "TOTAL_ORDERS",
  "LAST_PURCHASE_AT",
  "COUNTRY",
  "HAS_TAG",
  "CONSENT_STATUS",
] as const;

export const segmentOperatorValues = [
  "EQUALS",
  "NOT_EQUALS",
  "GREATER_THAN",
  "LESS_THAN",
  "BEFORE",
  "AFTER",
  "IS_NULL",
  "IS_NOT_NULL",
] as const;

export const ruleSchema = z.object({
  field: z.enum(segmentFieldValues),
  operator: z.enum(segmentOperatorValues),
  value: z.string().default(""),
});

export const segmentSchema = z.object({
  name: z.string().trim().min(2, "Give the segment a name"),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  matchType: z.enum(["ALL", "ANY"]),
  rules: z.array(ruleSchema).min(1, "Add at least one condition"),
});

export type SegmentFormValues = z.infer<typeof segmentSchema>;
