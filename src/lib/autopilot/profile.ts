/**
 * Store profile: what kind of business this is and how mature its audience is, derived from REAL synced data
 * (connected store, product catalogue, contacts, orders) with onboarding answers as the fallback. Pure: the
 * database loader lives in profile-loader.ts so this can be unit tested and reused anywhere.
 */

export type BusinessKind = "PHYSICAL" | "DIGITAL" | "SERVICE" | "CONTENT" | "MIXED";
export type Stage = "STARTING" | "GROWING" | "ESTABLISHED";
export type PriceBand = "LOW" | "MID" | "HIGH" | "UNKNOWN";

export type ProductLite = {
  name: string;
  type: string; // digital_product_type
  price: number | null;
  imageUrl: string | null;
  /** Public page of this product on the store, when the store provides one. */
  productUrl?: string | null;
  totalSales: number | null;
};

export type ProfileInputs = {
  storeBusinessModel: "PHYSICAL" | "DIGITAL" | "SUBSCRIPTION" | "MIXED" | null;
  useCase: "ECOMMERCE" | "NEWSLETTER" | "AGENCY" | "SAAS" | "OTHER" | null;
  industry: string | null;
  products: ProductLite[];
  contacts: { total: number; subscribed: number; customers: number; lapsed: number; neverPurchased: number; highSpenders: number; vipThreshold: number };
  orders90d: number;
  abandonedCheckouts30d: number;
  workspace: { name: string; logoUrl: string | null; website: string | null; currency: string; country: string | null };
};

export type StoreProfile = {
  kind: BusinessKind;
  /** Where the classification came from, shown to the user so the detection is explainable. */
  basis: "STORE" | "CATALOG" | "ONBOARDING" | "DEFAULT";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  stage: Stage;
  priceBand: PriceBand;
  signals: string[];
  /** Best products to feature: has a photo first, then best sellers, then newest order. */
  featured: ProductLite[];
  inputs: ProfileInputs;
};

const DIGITAL_TYPES = new Set(["EBOOK", "COURSE", "TEMPLATE", "BUNDLE"]);
const SERVICE_TYPES = new Set(["MEMBERSHIP", "SUBSCRIPTION", "SOFTWARE"]);

export function isHttpsImage(url: string | null | undefined): url is string {
  return !!url && /^https:\/\//i.test(url);
}

function fromCatalog(products: ProductLite[]): BusinessKind | null {
  const typed = products.filter((p) => p.type !== "OTHER");
  if (products.length < 2 || typed.length === 0) return null;
  const digital = typed.filter((p) => DIGITAL_TYPES.has(p.type)).length;
  const service = typed.filter((p) => SERVICE_TYPES.has(p.type)).length;
  if (digital / typed.length >= 0.7) return "DIGITAL";
  if (service / typed.length >= 0.7) return "SERVICE";
  if (digital + service > 0) return "MIXED";
  return null;
}

export function classifyStore(inputs: ProfileInputs): StoreProfile {
  const signals: string[] = [];
  let kind: BusinessKind;
  let basis: StoreProfile["basis"];
  let confidence: StoreProfile["confidence"];

  const model = inputs.storeBusinessModel;
  const catalogKind = fromCatalog(inputs.products);

  if (model) {
    kind = model === "SUBSCRIPTION" ? "SERVICE" : model;
    basis = "STORE";
    confidence = "HIGH";
    signals.push(`Your connected store is set up as ${model.toLowerCase()}.`);
  } else if (catalogKind) {
    kind = catalogKind;
    basis = "CATALOG";
    confidence = inputs.products.length >= 5 ? "HIGH" : "MEDIUM";
    signals.push(`${inputs.products.length} products in your catalogue point to ${catalogKind.toLowerCase()} sales.`);
  } else if (inputs.useCase && inputs.useCase !== "OTHER") {
    kind = inputs.useCase === "ECOMMERCE" ? "PHYSICAL" : inputs.useCase === "NEWSLETTER" ? "CONTENT" : "SERVICE";
    basis = "ONBOARDING";
    confidence = "MEDIUM";
    signals.push(`You told us during setup that this is ${inputs.useCase === "ECOMMERCE" ? "an online store" : inputs.useCase === "NEWSLETTER" ? "a newsletter" : inputs.useCase === "SAAS" ? "a software product" : "an agency"}.`);
  } else if (inputs.products.length > 0) {
    kind = "PHYSICAL";
    basis = "CATALOG";
    confidence = "LOW";
    signals.push("You have products, but none are labelled as digital or subscription, so we treat this as a physical-goods store.");
  } else {
    kind = "PHYSICAL";
    basis = "DEFAULT";
    confidence = "LOW";
    signals.push("Not enough data yet to be sure. Connect your store or add products and we will refine this.");
  }

  const total = inputs.contacts.total;
  const stage: Stage = total < 50 ? "STARTING" : total < 2000 ? "GROWING" : "ESTABLISHED";
  signals.push(`${total.toLocaleString("en-US")} contacts (${stage.toLowerCase()} audience).`);

  const prices = inputs.products.map((p) => p.price).filter((v): v is number => v !== null && v > 0).sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;
  const priceBand: PriceBand = median === null ? "UNKNOWN" : median < 25 ? "LOW" : median < 120 ? "MID" : "HIGH";

  const featured = [...inputs.products]
    .sort((a, b) => Number(isHttpsImage(b.imageUrl)) - Number(isHttpsImage(a.imageUrl)) || (b.totalSales ?? 0) - (a.totalSales ?? 0))
    .slice(0, 6);
  const withPhotos = inputs.products.filter((p) => isHttpsImage(p.imageUrl)).length;
  if (inputs.products.length) signals.push(`${withPhotos} of ${inputs.products.length} products have photos we can use in emails.`);
  if (inputs.abandonedCheckouts30d > 0) signals.push(`${inputs.abandonedCheckouts30d} abandoned checkouts in the last 30 days.`);

  return { kind, basis, confidence, stage, priceBand, signals, featured, inputs };
}
