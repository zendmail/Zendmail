import { describe, expect, it } from "vitest";
import { classifyStore, type ProfileInputs, type ProductLite } from "@/lib/autopilot/profile";
import { buildPlan } from "@/lib/autopilot/playbook";
import { blackFriday, upcomingOccasion } from "@/lib/autopilot/occasions";
import { personalizeTemplate, isRisky } from "@/lib/autopilot/personalize";
import { fallbackCopy, generateCopy } from "@/lib/autopilot/copy";
import { sanitizeBlocks } from "@/lib/email-builder/document";
import { TEMPLATE_LIBRARY } from "@/lib/template-library";

const product = (name: string, over: Partial<ProductLite> = {}): ProductLite => ({ name, type: "OTHER", price: 29, imageUrl: `https://cdn.example-shop.com/${name}.jpg`, totalSales: 3, ...over });
const base = (over: Partial<ProfileInputs> = {}): ProfileInputs => ({
  storeBusinessModel: null, useCase: null, industry: "Home & living",
  products: [product("Candle"), product("Vase"), product("Plate")],
  contacts: { total: 600, subscribed: 580, customers: 120, lapsed: 40, neverPurchased: 300, highSpenders: 12, vipThreshold: 300 },
  orders90d: 30, abandonedCheckouts30d: 4,
  workspace: { name: "Lumen & Co", logoUrl: "https://cdn.example-shop.com/logo.png", website: "https://lumen.shop", currency: "USD", country: "AE" },
  ...over,
});

describe("classifyStore", () => {
  it("trusts the connected store model", () => {
    const p = classifyStore(base({ storeBusinessModel: "SUBSCRIPTION" }));
    expect(p.kind).toBe("SERVICE");
    expect(p.basis).toBe("STORE");
    expect(p.confidence).toBe("HIGH");
  });
  it("detects digital from the catalogue", () => {
    const p = classifyStore(base({ products: [product("A", { type: "EBOOK" }), product("B", { type: "COURSE" }), product("C", { type: "TEMPLATE" })] }));
    expect(p.kind).toBe("DIGITAL");
    expect(p.basis).toBe("CATALOG");
  });
  it("falls back to onboarding, then to a low-confidence default", () => {
    expect(classifyStore(base({ products: [], useCase: "SAAS" })).kind).toBe("SERVICE");
    expect(classifyStore(base({ products: [], useCase: "NEWSLETTER" })).kind).toBe("CONTENT");
    const d = classifyStore(base({ products: [], useCase: null }));
    expect(d.basis).toBe("DEFAULT");
    expect(d.confidence).toBe("LOW");
  });
  it("features products with photos first and ranks stage and price band", () => {
    const p = classifyStore(base({ products: [product("NoPhoto", { imageUrl: null, totalSales: 99 }), product("Photo", { totalSales: 1 })] }));
    expect(p.featured[0].name).toBe("Photo");
    expect(p.stage).toBe("GROWING");
    expect(p.priceBand).toBe("MID");
  });
});

describe("buildPlan", () => {
  it("always plans a welcome flow and explains each item from data", () => {
    const plan = buildPlan(classifyStore(base()), new Date("2026-10-29T10:00:00Z"));
    expect(plan.items[0].key).toBe("welcome-series");
    expect(plan.items.some((i) => i.key === "seasonal-black-friday")).toBe(true);
    const winBack = plan.items.find((i) => i.key === "win-back");
    expect(winBack?.audience.type).toBe("SEGMENT");
    expect(winBack?.why).toContain("40");
    expect(plan.items.length).toBeLessThanOrEqual(6);
  });
  it("skips segments the audience is too small for and product emails without products", () => {
    const plan = buildPlan(classifyStore(base({ products: [], contacts: { total: 20, subscribed: 20, customers: 2, lapsed: 0, neverPurchased: 18, highSpenders: 0, vipThreshold: 0 } })), new Date("2026-03-10T00:00:00Z"));
    expect(plan.items.map((i) => i.key)).toEqual(["welcome-series"]);
  });
});

describe("occasions", () => {
  it("computes Black Friday", () => {
    expect(blackFriday(2026).toISOString().slice(0, 10)).toBe("2026-11-27");
    expect(blackFriday(2025).toISOString().slice(0, 10)).toBe("2025-11-28");
  });
  it("only reports occasions inside the window", () => {
    expect(upcomingOccasion(new Date("2026-10-29T00:00:00Z"))?.key).toBe("black-friday");
    expect(upcomingOccasion(new Date("2026-03-01T00:00:00Z"))).toBeNull();
  });
});

describe("personalizeTemplate on the whole library", () => {
  const profile = classifyStore(base());
  const item = buildPlan(profile).items[0];
  const copy = fallbackCopy(item, "Lumen & Co");
  const brand = profile.inputs.workspace;

  it("produces safe, valid, branded emails for every template", () => {
    for (const def of TEMPLATE_LIBRARY) {
      const r = personalizeTemplate(def, { brand, products: profile.inputs.products, copy, usesProducts: true });
      const json = JSON.stringify(r.blocks);
      expect(json, def.key).not.toMatch(/example\.com/);
      expect(r.blocks.some((b) => b.type === "coupon" || b.type === "testimonials" || b.type === "social"), def.key).toBe(false);
      expect(JSON.parse(JSON.stringify(sanitizeBlocks(r.blocks))), def.key).toEqual(JSON.parse(json));
      const texts = r.blocks.flatMap((b) => Object.entries(b).filter(([k, v]) => typeof v === "string" && !["id", "type", "imageUrl", "url", "buttonUrl", "logoUrl", "imageAlt", "icon", "shape", "top", "bottom", "bg", "color", "accent", "sectionBg", "cardBg", "style", "imageSide", "imagePosition", "align", "price"].includes(k)).map(([, v]) => v as string));
      for (const t of texts) expect(isRisky(t), `${def.key}: ${t}`).toBe(false);
      const header = r.blocks.find((b) => b.type === "header");
      if (header?.type === "header") expect(header.brand).toBe("Lumen & Co");
    }
  });

  it("uses real products, photos and prices in product sections", () => {
    const def = TEMPLATE_LIBRARY.find((t) => t.key === "newsletter-clean")!;
    const r = personalizeTemplate(def, { brand, products: profile.inputs.products, copy, usesProducts: true });
    const cards = r.blocks.find((b) => b.type === "cards");
    expect(cards?.type === "cards" && cards.items.map((i) => i.title)).toEqual(["Candle", "Vase", "Plate"].slice(0, cards?.type === "cards" ? cards.items.length : 0));
    expect(cards?.type === "cards" && cards.items[0].imageUrl).toBe("https://cdn.example-shop.com/Candle.jpg");
    expect(cards?.type === "cards" && cards.items[0].price).toBe("$29");
    expect(r.subject).toBe(copy.subject);
  });

  it("links each product to its own page, falling back to the store website", () => {
    const def = TEMPLATE_LIBRARY.find((t) => t.key === "newsletter-clean")!;
    const products = [product("Candle", { productUrl: "https://lumen.shop/products/candle" }), product("Vase", { productUrl: "http://insecure.example/vase" }), product("Plate")];
    const r = personalizeTemplate(def, { brand, products, copy, usesProducts: true });
    const cards = r.blocks.find((b) => b.type === "cards");
    const urls = cards?.type === "cards" ? cards.items.map((i) => i.buttonUrl) : [];
    expect(urls).toEqual(["https://lumen.shop/products/candle", "https://lumen.shop", "https://lumen.shop"]);
  });

  it("drops product sections and warns when there are no products or no website", () => {
    const def = TEMPLATE_LIBRARY.find((t) => t.key === "newsletter-clean")!;
    const r = personalizeTemplate(def, { brand: { ...brand, website: null }, products: [], copy, usesProducts: true });
    expect(r.blocks.some((b) => b.type === "cards")).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/website/i);
    expect(r.warnings.join(" ")).toMatch(/products/i);
  });
});

describe("generateCopy", () => {
  const profile = classifyStore(base());
  const item = buildPlan(profile).items[0];
  const good = JSON.stringify({ subject: "Welcome to Lumen", previewText: "Here is where to start.", eyebrow: "Welcome", headline: "Glad you are here", text: "Thanks for joining us at Lumen.", buttonLabel: "Take a look" });

  it("uses valid AI output", async () => {
    const r = await generateCopy(item, profile, async () => "```json\n" + good + "\n```");
    expect(r.source).toBe("AI");
    expect(r.copy.headline).toBe("Glad you are here");
  });
  it("falls back on invalid JSON, schema failures and invented claims", async () => {
    expect((await generateCopy(item, profile, async () => "nope")).source).toBe("FALLBACK");
    expect((await generateCopy(item, profile, async () => JSON.stringify({ subject: "x" }))).source).toBe("FALLBACK");
    const risky = JSON.stringify({ ...JSON.parse(good), headline: "Get 50% off today" });
    expect((await generateCopy(item, profile, async () => risky)).source).toBe("FALLBACK");
    expect((await generateCopy(item, profile, async () => { throw new Error("down"); })).source).toBe("FALLBACK");
    expect((await generateCopy(item, profile, null)).source).toBe("FALLBACK");
  });
});
