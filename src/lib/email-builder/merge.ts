/**
 * Merge tags: {{first_name}}, {{first_name|there}} (with fallback), {{business_name}}, …
 * Applied to the final rendered email, with values HTML-escaped for the HTML version.
 */

export type MergeVars = Partial<{
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  business_name: string;
  unsubscribe_url: string;
}>;

export const MERGE_TAG_NAMES = ["first_name", "last_name", "full_name", "email", "business_name", "unsubscribe_url"] as const;

export const SAMPLE_VARS: Required<MergeVars> = {
  first_name: "Alex",
  last_name: "Morgan",
  full_name: "Alex Morgan",
  email: "alex@example.com",
  business_name: "Your brand",
  unsubscribe_url: "#",
};

const TAG = /\{\{\s*([a-z_]+)\s*(?:\|\s*([^}]*?))?\s*\}\}/gi;

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildVars(input: { firstName?: string | null; lastName?: string | null; email?: string | null; businessName?: string | null; unsubscribeUrl?: string }): MergeVars {
  const first = input.firstName?.trim() || "";
  const last = input.lastName?.trim() || "";
  return {
    first_name: first,
    last_name: last,
    full_name: [first, last].filter(Boolean).join(" "),
    email: input.email ?? "",
    business_name: input.businessName ?? "",
    unsubscribe_url: input.unsubscribeUrl ?? "",
  };
}

export function applyMergeTags(input: string, vars: MergeVars, format: "html" | "text" = "html"): string {
  return input.replace(TAG, (whole, rawName: string, fallback?: string) => {
    const name = rawName.toLowerCase();
    if (!(MERGE_TAG_NAMES as readonly string[]).includes(name)) return whole; // not ours — leave untouched
    const value = (vars[name as keyof MergeVars] ?? "").toString().trim() || (fallback ?? "").trim();
    return format === "html" ? escapeHtml(value) : value;
  });
}
