import type { EmailBlock } from "@/db/schema";
import { createDefaultBlock, newBlockId } from "./email-blocks";

function textBlock(html: string): EmailBlock {
  return { id: newBlockId(), type: "text", html };
}
function headingBlock(text: string): EmailBlock {
  return { id: newBlockId(), type: "heading", text };
}
function buttonBlock(label: string, url = "https://example.com"): EmailBlock {
  return { id: newBlockId(), type: "button", label, url };
}
const footer = () =>
  createDefaultBlock("footer") as Extract<EmailBlock, { type: "footer" }>;
const divider = () => createDefaultBlock("divider");
const spacer = (h = 16) => ({ ...createDefaultBlock("spacer"), height: h } as EmailBlock);

export const starterTemplates: {
  name: string;
  category:
    | "WELCOME"
    | "NEWSLETTER"
    | "PROMOTIONAL"
    | "ABANDONED_CART"
    | "POST_PURCHASE"
    | "WIN_BACK"
    | "PRODUCT_LAUNCH"
    | "SALE"
    | "THANK_YOU";
  subject: string;
  previewText: string;
  blocks: EmailBlock[];
}[] = [
  {
    name: "Welcome email",
    category: "WELCOME",
    subject: "Welcome to {{business_name}}!",
    previewText: "We're glad you're here.",
    blocks: [
      headingBlock("Welcome to {{business_name}} 👋"),
      textBlock("<p>Thanks for joining us. Here's what to expect from our emails, and a little about who we are.</p>"),
      buttonBlock("Start shopping"),
      divider(),
      footer(),
    ],
  },
  {
    name: "Monthly newsletter",
    category: "NEWSLETTER",
    subject: "What's new this month",
    previewText: "Updates, tips, and what we've been working on.",
    blocks: [
      headingBlock("This month at {{business_name}}"),
      textBlock("<p>A quick roundup of what's new, plus a few things we think you'll like.</p>"),
      spacer(8),
      buttonBlock("Read more"),
      footer(),
    ],
  },
  {
    name: "Promotional offer",
    category: "PROMOTIONAL",
    subject: "20% off, just for you",
    previewText: "A limited-time offer inside.",
    blocks: [
      headingBlock("Enjoy 20% off"),
      textBlock("<p>For a limited time, take 20% off your next order. Use the button below to shop the sale.</p>"),
      buttonBlock("Shop the sale"),
      footer(),
    ],
  },
  {
    name: "Abandoned cart reminder",
    category: "ABANDONED_CART",
    subject: "You left something in your cart",
    previewText: "Your items are still waiting for you.",
    blocks: [
      headingBlock("Still thinking it over?"),
      textBlock("<p>We saved your cart. Complete your order before your items sell out.</p>"),
      buttonBlock("Complete your order"),
      footer(),
    ],
  },
  {
    name: "Post-purchase thank you",
    category: "POST_PURCHASE",
    subject: "Thanks for your order!",
    previewText: "Your order is on its way.",
    blocks: [
      headingBlock("Thank you for your order"),
      textBlock("<p>We're getting your order ready. You'll get a shipping confirmation soon.</p>"),
      buttonBlock("View your order"),
      footer(),
    ],
  },
  {
    name: "Win-back",
    category: "WIN_BACK",
    subject: "We miss you",
    previewText: "It's been a while — here's something special.",
    blocks: [
      headingBlock("We miss you"),
      textBlock("<p>It's been a while since your last visit. Come back and enjoy 15% off your next order.</p>"),
      buttonBlock("Shop now"),
      footer(),
    ],
  },
  {
    name: "Product launch",
    category: "PRODUCT_LAUNCH",
    subject: "Introducing our newest product",
    previewText: "Meet the newest addition to the lineup.",
    blocks: [
      headingBlock("Say hello to our newest product"),
      textBlock("<p>We've been working on something new. Get an early look before everyone else.</p>"),
      buttonBlock("See what's new"),
      footer(),
    ],
  },
  {
    name: "Sale announcement",
    category: "SALE",
    subject: "Our biggest sale of the season",
    previewText: "Don't miss out — sale ends soon.",
    blocks: [
      headingBlock("Our biggest sale yet"),
      textBlock("<p>Save across the entire store for a limited time only.</p>"),
      buttonBlock("Shop the sale"),
      footer(),
    ],
  },
  {
    name: "Thank you",
    category: "THANK_YOU",
    subject: "Thank you for being a customer",
    previewText: "We appreciate you.",
    blocks: [
      headingBlock("Thank you"),
      textBlock("<p>We just wanted to say thank you for being a loyal customer.</p>"),
      footer(),
    ],
  },
];
