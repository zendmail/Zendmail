/**
 * Works out whether a synced product is digital, a service/subscription, or a normal physical product, from the signals each
 * platform actually gives us. Pure so it is unit tested. "OTHER" means "no clear signal" (treated as physical downstream).
 */

export type DigitalProductType = "EBOOK" | "COURSE" | "TEMPLATE" | "SOFTWARE" | "MEMBERSHIP" | "SUBSCRIPTION" | "BUNDLE" | "OTHER";

const RULES: [DigitalProductType, RegExp][] = [
  ["COURSE", /\b(course|masterclass|workshop|class(es)?|bootcamp|webinar|e-?learning|training|tutorial)\b/i],
  ["EBOOK", /\b(e-?books?|pdf|guide|playbook|handbook|audiobook|cheat ?sheet|printable)\b/i],
  ["TEMPLATE", /\b(templates?|presets?|lightroom|notion|canva|spreadsheet|planner|swipe file|font|mockup|svg|stock (photo|image)s?)\b/i],
  ["SOFTWARE", /\b(software|app|plugin|plug-in|add-?on|extension|saas|license|licence|api|theme)\b/i],
  ["MEMBERSHIP", /\b(membership|member|community|club|patreon|access pass)\b/i],
  ["SUBSCRIPTION", /\b(subscription|subscribe|monthly plan|annual plan|retainer|plan)\b/i],
  ["BUNDLE", /\b(bundle|toolkit|starter kit)\b/i],
];

export function classifyProductType(input: {
  title: string;
  productType?: string | null;
  tags?: string[] | null;
  /** WooCommerce: product is virtual / downloadable. */
  virtual?: boolean;
  downloadable?: boolean;
  /** WooCommerce product type, e.g. "subscription", "variable-subscription". */
  wooType?: string | null;
}): DigitalProductType {
  if (input.wooType && /subscription/i.test(input.wooType)) return "SUBSCRIPTION";
  const text = [input.productType, ...(input.tags ?? [])].filter(Boolean).join(" ");

  // The merchant's own labels (product type, tags) are the strongest signal; the title is weaker.
  for (const [type, re] of RULES) if (text && re.test(text)) return type;
  const explicitlyDigital = input.virtual === true || input.downloadable === true;
  if (explicitlyDigital) {
    for (const [type, re] of RULES) if (re.test(input.title)) return type;
    return "EBOOK"; // virtual/downloadable with no better label: treat as a downloadable
  }
  // Title alone only counts for unambiguous words, so "Plan B Candle" or "App-leton Mug" stay physical.
  const strongTitle = /\b(e-?book|online course|masterclass|digital download|printable|lightroom presets?|membership|subscription|license key)\b/i;
  if (strongTitle.test(input.title)) {
    for (const [type, re] of RULES) if (re.test(input.title)) return type;
  }
  return "OTHER";
}
