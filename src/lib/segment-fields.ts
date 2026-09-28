export type SegmentField =
  | "STATUS"
  | "TOTAL_SPENT"
  | "TOTAL_ORDERS"
  | "LAST_PURCHASE_AT"
  | "COUNTRY"
  | "HAS_TAG"
  | "CONSENT_STATUS";

export type SegmentOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "BEFORE"
  | "AFTER"
  | "IS_NULL"
  | "IS_NOT_NULL";

export const fieldConfig: Record<
  SegmentField,
  {
    label: string;
    category: "Demographics" | "Commerce" | "Engagement";
    operators: { value: SegmentOperator; label: string }[];
    inputType: "select" | "number" | "days" | "text" | "none";
    options?: { value: string; label: string }[];
  }
> = {
  STATUS: {
    label: "Contact status",
    category: "Demographics",
    operators: [
      { value: "EQUALS", label: "is" },
      { value: "NOT_EQUALS", label: "is not" },
    ],
    inputType: "select",
    options: [
      { value: "SUBSCRIBER", label: "Subscriber" },
      { value: "CUSTOMER", label: "Customer" },
      { value: "LEAD", label: "Lead" },
      { value: "VIP", label: "VIP" },
      { value: "INACTIVE", label: "Inactive" },
      { value: "UNSUBSCRIBED", label: "Unsubscribed" },
      { value: "BOUNCED", label: "Bounced" },
    ],
  },
  COUNTRY: {
    label: "Country",
    category: "Demographics",
    operators: [
      { value: "EQUALS", label: "is" },
      { value: "NOT_EQUALS", label: "is not" },
    ],
    inputType: "text",
  },
  TOTAL_SPENT: {
    label: "Total spent",
    category: "Commerce",
    operators: [
      { value: "GREATER_THAN", label: "is more than" },
      { value: "LESS_THAN", label: "is less than" },
    ],
    inputType: "number",
  },
  TOTAL_ORDERS: {
    label: "Number of orders",
    category: "Commerce",
    operators: [
      { value: "GREATER_THAN", label: "is more than" },
      { value: "LESS_THAN", label: "is less than" },
    ],
    inputType: "number",
  },
  LAST_PURCHASE_AT: {
    label: "Last purchase",
    category: "Commerce",
    operators: [
      { value: "BEFORE", label: "was more than (days ago)" },
      { value: "AFTER", label: "was within the last (days)" },
      { value: "IS_NULL", label: "never purchased" },
    ],
    inputType: "days",
  },
  HAS_TAG: {
    label: "Tag",
    category: "Engagement",
    operators: [
      { value: "EQUALS", label: "has tag" },
      { value: "NOT_EQUALS", label: "does not have tag" },
    ],
    inputType: "text",
  },
  CONSENT_STATUS: {
    label: "Consent status",
    category: "Engagement",
    operators: [
      { value: "EQUALS", label: "is" },
      { value: "NOT_EQUALS", label: "is not" },
    ],
    inputType: "select",
    options: [
      { value: "GRANTED", label: "Granted" },
      { value: "NOT_PROVIDED", label: "Not provided" },
      { value: "WITHDRAWN", label: "Withdrawn" },
    ],
  },
};

export function needsValueInput(operator: SegmentOperator) {
  return operator !== "IS_NULL" && operator !== "IS_NOT_NULL";
}
