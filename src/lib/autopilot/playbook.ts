import type { StoreProfile } from "./profile";
import { upcomingOccasion } from "./occasions";

/**
 * The playbook: given a store profile, which emails should go to whom, and when. Pure rules (no AI) so the plan
 * is explainable and predictable; AI only writes the copy later. Every item says WHY it was chosen from the data.
 */

export type AudienceRule = {
  field: "STATUS" | "TOTAL_SPENT" | "TOTAL_ORDERS" | "LAST_PURCHASE_AT";
  operator: "EQUALS" | "GREATER_THAN" | "LESS_THAN" | "BEFORE" | "AFTER" | "IS_NULL";
  value: string | null;
};

export type AudienceSpec =
  | { type: "ALL"; label: string }
  | { type: "SEGMENT"; label: string; segmentName: string; matchType: "ALL" | "ANY"; rules: AudienceRule[] };

export type PlanKind = "CAMPAIGN" | "WELCOME_FLOW";

export type PlanItem = {
  key: string;
  kind: PlanKind;
  title: string;
  goal: string;
  why: string;
  audience: AudienceSpec;
  timing: string;
  /** Preferred template keys, first usable one (by plan tier) wins. */
  templateKeys: string[];
  copyBrief: string;
  priority: number;
  /** Includes the store's products in the email (needs real products to be sent). */
  usesProducts: boolean;
};

export type Recommendation = { key: string; title: string; why: string };

export type Plan = { items: PlanItem[]; recommendations: Recommendation[] };

const WELCOME_TEMPLATE: Record<StoreProfile["kind"], string[]> = {
  PHYSICAL: ["welcome-gradient"],
  DIGITAL: ["pro-course-welcome", "starter-kit-welcome", "welcome-gradient"],
  SERVICE: ["saas-onboarding", "welcome-gradient"],
  CONTENT: ["welcome-gradient"],
  MIXED: ["welcome-gradient"],
};

export function buildPlan(profile: StoreProfile, now: Date = new Date()): Plan {
  const { inputs, kind, stage } = profile;
  const c = inputs.contacts;
  const hasProducts = inputs.products.length >= 1;
  const physicalish = kind === "PHYSICAL" || kind === "MIXED";
  const items: PlanItem[] = [];

  items.push({
    key: "welcome-series",
    kind: "WELCOME_FLOW",
    title: "Welcome email for every new subscriber",
    goal: "Make a great first impression and drive the first visit or purchase.",
    why: "Welcome emails are opened far more than any other email and every business needs one. It runs automatically when a new contact is added.",
    audience: { type: "ALL", label: "Every new contact, automatically" },
    timing: "Sent immediately when someone joins",
    templateKeys: WELCOME_TEMPLATE[kind],
    copyBrief: "A warm welcome that tells new subscribers what to expect and points them to the best thing to do first.",
    priority: 100,
    usesProducts: false,
  });

  const occasion = upcomingOccasion(now);
  if (occasion && (physicalish || kind === "DIGITAL")) {
    const days = Math.max(0, Math.round((occasion.date.getTime() - now.getTime()) / 86_400_000));
    items.push({
      key: `seasonal-${occasion.key}`,
      kind: "CAMPAIGN",
      title: `${occasion.label} campaign`,
      goal: "Capture seasonal demand before competitors do.",
      why: `${occasion.label} is about ${days} day${days === 1 ? "" : "s"} away. Stores that email early (not only on the day) see the best results.`,
      audience: { type: "ALL", label: "All subscribers who can receive marketing" },
      timing: days > 7 ? "Send about a week before, then a reminder on the day" : "Send as soon as you approve",
      templateKeys: occasion.templateKeys,
      copyBrief: `A ${occasion.label} email that builds anticipation for the shop's products. Do not invent discounts or deadlines.`,
      priority: 90,
      usesProducts: true,
    });
  }

  if (hasProducts && (physicalish || kind === "DIGITAL")) {
    items.push({
      key: "bestsellers",
      kind: "CAMPAIGN",
      title: kind === "DIGITAL" ? "Spotlight your best product" : "Bestsellers and favourites",
      goal: "Turn subscribers into buyers with your strongest products.",
      why: `You have ${inputs.products.length} product${inputs.products.length === 1 ? "" : "s"}${profile.featured.some((p) => (p.totalSales ?? 0) > 0) ? ", and we ranked them by real sales" : ""}. Product-led emails are the simplest way to drive revenue.`,
      audience: { type: "ALL", label: "All subscribers who can receive marketing" },
      timing: "Tuesday or Thursday, mid-morning in your timezone",
      templateKeys: kind === "DIGITAL" ? ["digital-ebook-launch", "pro-digital-course-launch"] : ["newsletter-clean", "sale-bold"],
      copyBrief: "Introduce the featured products and why customers love them.",
      priority: 80,
      usesProducts: true,
    });
  }

  if (c.lapsed >= 10) {
    items.push({
      key: "win-back",
      kind: "CAMPAIGN",
      title: "Win back lapsed customers",
      goal: "Bring back customers who bought before but went quiet.",
      why: `${c.lapsed} customers have not purchased in 90+ days. Re-engaging existing customers costs far less than finding new ones.`,
      audience: {
        type: "SEGMENT", label: "Customers whose last purchase was over 90 days ago", segmentName: "Autopilot: lapsed customers (90+ days)", matchType: "ALL",
        rules: [{ field: "TOTAL_ORDERS", operator: "GREATER_THAN", value: "0" }, { field: "LAST_PURCHASE_AT", operator: "BEFORE", value: "90" }],
      },
      timing: "Send once, then stop for anyone who does not open",
      templateKeys: kind === "SERVICE" ? ["membership-reactivate", "win-back"] : ["win-back"],
      copyBrief: "A friendly 'we miss you' email that reminds them what they liked. No invented discount.",
      priority: 70,
      usesProducts: false,
    });
  }

  if (c.neverPurchased >= 10 && stage !== "STARTING") {
    items.push({
      key: "first-purchase",
      kind: "CAMPAIGN",
      title: "Nudge subscribers who have not bought yet",
      goal: "Convert people who joined but never purchased.",
      why: `${c.neverPurchased} subscribers have never bought anything. A focused first-purchase email is usually the highest-converting message for this group.`,
      audience: {
        type: "SEGMENT", label: "Subscribers with no purchases yet", segmentName: "Autopilot: never purchased", matchType: "ALL",
        rules: [{ field: "LAST_PURCHASE_AT", operator: "IS_NULL", value: null }],
      },
      timing: "A few days after they joined; Tuesday to Thursday works best",
      templateKeys: kind === "SERVICE" ? ["pro-saas-trial-ending", "saas-onboarding"] : ["promo-coupon", "newsletter-clean"],
      copyBrief: "Encourage a first purchase by highlighting what makes the shop worth trying. Do not mention a discount code.",
      priority: 65,
      usesProducts: hasProducts,
    });
  }

  if (c.highSpenders >= 5) {
    items.push({
      key: "vip-thanks",
      kind: "CAMPAIGN",
      title: "Thank your best customers",
      goal: "Reward loyalty and encourage repeat purchases.",
      why: `${c.highSpenders} customers have spent ${inputs.workspace.currency} ${c.vipThreshold}+ with you. Your top customers usually drive a large share of revenue.`,
      audience: {
        type: "SEGMENT", label: `Customers who spent over ${inputs.workspace.currency} ${c.vipThreshold}`, segmentName: "Autopilot: top customers", matchType: "ALL",
        rules: [{ field: "TOTAL_SPENT", operator: "GREATER_THAN", value: String(c.vipThreshold) }],
      },
      timing: "Any weekday; keep it personal and unrushed",
      templateKeys: ["pro-vip-loyalty", "thank-you-simple"],
      copyBrief: "A sincere thank-you to loyal customers with early access feel. No discount or code.",
      priority: 60,
      usesProducts: false,
    });
  }

  if (kind === "CONTENT" || (stage !== "STARTING" && kind !== "PHYSICAL")) {
    items.push({
      key: "newsletter",
      kind: "CAMPAIGN",
      title: "Regular newsletter",
      goal: "Stay top of mind between purchases.",
      why: "A consistent, useful email keeps your audience warm. Two to four a month is the sweet spot for most small businesses.",
      audience: { type: "ALL", label: "All subscribers who can receive marketing" },
      timing: "Same day and time each week or fortnight",
      templateKeys: ["pro-weekly-digest", "newsletter-clean"],
      copyBrief: "A short, useful update with one clear call to action.",
      priority: 50,
      usesProducts: hasProducts,
    });
  }

  const recommendations: Recommendation[] = [];
  if (inputs.abandonedCheckouts30d > 0 || physicalish) {
    recommendations.push({
      key: "abandoned-cart",
      title: "Abandoned cart reminder",
      why: inputs.abandonedCheckouts30d > 0
        ? `${inputs.abandonedCheckouts30d} checkouts were abandoned in the last 30 days. An automatic reminder normally recovers a meaningful share. It needs live store events, which Zendmail will switch on once the store webhooks are connected.`
        : "Automatic reminders for abandoned carts need live store events, which Zendmail will switch on once the store webhooks are connected.",
    });
  }
  if (physicalish) recommendations.push({ key: "post-purchase", title: "Post-purchase thank-you and review request", why: "Sent a few days after delivery. This also needs live order events; the template is ready in your library." });

  return { items: items.sort((a, b) => b.priority - a.priority).slice(0, 6), recommendations };
}
