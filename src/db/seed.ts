import "dotenv/config";
import { db } from "./client";
import { plans, emailTemplates, featureFlags } from "./schema";
import { starterTemplates } from "../lib/starter-templates";

const defaultPlans = [
  {
    key: "free",
    name: "Free",
    priceMonthly: "0",
    contactLimit: 500,
    emailSendLimit: 2000,
    aiGenerationLimit: 10,
    connectedStoreLimit: 1,
    features: ["Email campaigns", "Basic segmentation", "1 connected store"],
  },
  {
    key: "starter",
    name: "Starter",
    priceMonthly: "29",
    contactLimit: 2500,
    emailSendLimit: 15000,
    aiGenerationLimit: 50,
    connectedStoreLimit: 1,
    features: ["Everything in Free", "Automations", "Abandoned cart recovery"],
  },
  {
    key: "growth",
    name: "Growth",
    priceMonthly: "79",
    contactLimit: 10000,
    emailSendLimit: 75000,
    aiGenerationLimit: 250,
    connectedStoreLimit: 3,
    features: ["Everything in Starter", "AI Studio", "Revenue attribution"],
  },
  {
    key: "pro",
    name: "Pro",
    priceMonthly: "199",
    contactLimit: 50000,
    emailSendLimit: 400000,
    aiGenerationLimit: 1000,
    connectedStoreLimit: 10,
    features: ["Everything in Growth", "AI Audience Builder", "Priority support"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    priceMonthly: null,
    contactLimit: null,
    emailSendLimit: null,
    aiGenerationLimit: null,
    connectedStoreLimit: null,
    features: ["Everything in Pro", "White-label", "Dedicated onboarding"],
  },
];

async function main() {
  for (const plan of defaultPlans) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoNothing({ target: plans.key });
  }
  console.log(`Seeded ${defaultPlans.length} plans.`);

  const existingTemplates = await db.select({ id: emailTemplates.id }).from(emailTemplates).limit(1);
  if (existingTemplates.length === 0) {
    await db.insert(emailTemplates).values(
      starterTemplates.map((t) => ({
        workspaceId: null,
        name: t.name,
        category: t.category,
        subject: t.subject,
        previewText: t.previewText,
        blocks: t.blocks,
      }))
    );
    console.log(`Seeded ${starterTemplates.length} starter templates.`);
  } else {
    console.log("Starter templates already seeded, skipping.");
  }

  const defaultFlags = [
    { key: "ai_studio", name: "AI Studio", description: "Enable the AI email generation tools.", enabled: true },
    { key: "automations", name: "Automations", description: "Enable the automation builder.", enabled: true },
    { key: "commerce_integrations", name: "Commerce integrations", description: "Enable Shopify/WooCommerce connections.", enabled: false },
  ];
  for (const flag of defaultFlags) {
    await db.insert(featureFlags).values(flag).onConflictDoNothing({ target: featureFlags.key });
  }
  console.log(`Seeded ${defaultFlags.length} feature flags.`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
