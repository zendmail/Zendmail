import type { EmailBlock } from "@/db/schema";

export type Template = {
  id: string;
  name: string;
  category: string;
  subject: string | null;
  previewText: string | null;
  blocks: EmailBlock[];
};

export const templateCategories = [
  { value: "WELCOME", label: "Welcome", image: "photo-1498050108023-c5249f4df085" },
  { value: "NEWSLETTER", label: "Newsletter", image: "photo-1497366216548-37526070297c" },
  { value: "PROMOTIONAL", label: "Promotional", image: "photo-1542291026-7eec264c27ff" },
  { value: "ABANDONED_CART", label: "Abandoned cart", image: "photo-1543163521-1bf539c55dd2" },
  { value: "POST_PURCHASE", label: "Post-purchase", image: "photo-1607082348824-0a96f2a4b9da" },
  { value: "WIN_BACK", label: "Win-back", image: "photo-1503342217505-b0a15ec3261c" },
  { value: "PRODUCT_LAUNCH", label: "Product launch", image: "photo-1526170375885-4d8ecf77b99f" },
  { value: "SALE", label: "Sale", image: "photo-1490481651871-ab68de25d43d" },
  { value: "THANK_YOU", label: "Thank you", image: "photo-1513201099705-a9746e1e201f" },
] as const;

export const categoryLabels: Record<string, string> = Object.fromEntries(
  templateCategories.map(({ value, label }) => [value, label])
);
categoryLabels.CUSTOM = "Custom";

export const categoryImages: Record<string, string> = Object.fromEntries(
  templateCategories.map(({ value, image }) => [
    value,
    `https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=80`,
  ])
);
categoryImages.CUSTOM = "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80";

const categoryPreviewCopy: Record<string, { headline: string; supportingText: string; buttonLabel: string }> = {
  WELCOME: { headline: "Welcome to Zendmail!", supportingText: "Let's get started.", buttonLabel: "Get Started" },
  NEWSLETTER: { headline: "Monthly Newsletter", supportingText: "What's new this month", buttonLabel: "Read More" },
  PROMOTIONAL: { headline: "Special Offer Just for You!", supportingText: "Get 20% off your next purchase.", buttonLabel: "Shop Now" },
  ABANDONED_CART: { headline: "You left something behind...", supportingText: "Complete your purchase while your picks are still here.", buttonLabel: "Complete Purchase" },
  POST_PURCHASE: { headline: "Thank you for your order!", supportingText: "Your order has been confirmed.", buttonLabel: "View Order" },
  WIN_BACK: { headline: "We miss you!", supportingText: "Come back and enjoy 15% off.", buttonLabel: "Shop Now" },
  PRODUCT_LAUNCH: { headline: "Introducing our newest product", supportingText: "Smarter. Faster. Better.", buttonLabel: "Learn More" },
  SALE: { headline: "Big Sale", supportingText: "Up to 50% off.", buttonLabel: "Shop Now" },
  THANK_YOU: { headline: "Thank You!", supportingText: "For being a valued customer.", buttonLabel: "Shop Again" },
};

export function getTemplateHeading(template: Template) {
  const heading = template.blocks.find((block) => block.type === "heading");
  return heading?.type === "heading" ? heading.text : template.subject || template.name;
}

export function getTemplateButtonLabel(template: Template) {
  const button = template.blocks.find((block) => block.type === "button");
  return button?.type === "button" ? button.label : "Discover more";
}

export function replaceBusinessName(value: string) {
  return value.replace(/\{\{business_name\}\}/gi, "Your brand");
}

export function getTemplatePreviewContent(template: Template) {
  const categoryCopy = categoryPreviewCopy[template.category];
  if (categoryCopy) return categoryCopy;

  return {
    headline: replaceBusinessName(getTemplateHeading(template)),
    supportingText: replaceBusinessName(template.previewText || "A thoughtful message, made easy to send."),
    buttonLabel: getTemplateButtonLabel(template),
  };
}