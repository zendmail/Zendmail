import "server-only";
import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { autopilotProposals, automations } from "@/db/schema";
import { aiComplete } from "@/lib/ai/provider";
import { canUseTemplate } from "@/lib/template-access";
import { TEMPLATE_LIBRARY } from "@/lib/template-library";
import { loadStoreProfile } from "./profile-loader";
import { buildPlan } from "./playbook";
import { generateCopy } from "./copy";
import { personalizeTemplate } from "./personalize";

const DAY = 86_400_000;

export type WorkspaceForAutopilot = { id: string; name: string; logoUrl: string | null; website: string | null; currency: string; planName: string };

/**
 * Builds the plan for a workspace and replaces its pending proposals. Shared by the "Create my plan" button and the weekly
 * refresh job. Never sends anything. Returns how many proposals were prepared and what kind of business was detected.
 */
export async function generateProposalsForWorkspace(workspace: WorkspaceForAutopilot) {
  const profile = await loadStoreProfile(workspace.id);
  const plan = buildPlan(profile);

  // Don't re-propose what was recently approved (14 days) or dismissed (30 days).
  const recent = await db
    .select({ key: autopilotProposals.key, status: autopilotProposals.status, decidedAt: autopilotProposals.decidedAt })
    .from(autopilotProposals)
    .where(and(eq(autopilotProposals.workspaceId, workspace.id), inArray(autopilotProposals.status, ["APPROVED", "DISMISSED"]), gte(autopilotProposals.decidedAt, new Date(Date.now() - 30 * DAY))));
  const skip = new Set(recent.filter((r) => r.status === "DISMISSED" || (r.decidedAt && r.decidedAt.getTime() > Date.now() - 14 * DAY)).map((r) => r.key));

  // An approved welcome flow that was later deleted must be offered again.
  const [liveWelcome] = await db
    .select({ id: automations.id })
    .from(automations)
    .where(and(eq(automations.workspaceId, workspace.id), eq(automations.triggerType, "CONTACT_CREATED"), isNull(automations.deletedAt)))
    .limit(1);
  if (!liveWelcome) {
    for (const r of recent) if (r.status === "APPROVED" && r.key.startsWith("welcome")) skip.delete(r.key);
  }

  const useAi = !!process.env.AI_PROVIDER_API_KEY;
  const built = await Promise.all(
    plan.items.filter((i) => !skip.has(i.key)).map(async (item) => {
      const def = item.templateKeys.map((k) => TEMPLATE_LIBRARY.find((t) => t.key === k)).find((t) => t && canUseTemplate(workspace.planName, t.tier));
      if (!def) return null;
      const { copy, source } = await generateCopy(item, profile, useAi ? aiComplete : null);
      const out = personalizeTemplate(def, { brand: { name: workspace.name, logoUrl: workspace.logoUrl, website: workspace.website, currency: workspace.currency }, products: profile.featured, copy, usesProducts: item.usesProducts });
      return { item, def, source, out };
    })
  );

  const rows = built.filter((b): b is NonNullable<typeof b> => b !== null).map(({ item, def, source, out }) => ({
    workspaceId: workspace.id,
    key: item.key,
    kind: item.kind,
    title: item.title,
    goal: item.goal,
    why: item.why,
    timing: item.timing,
    audience: item.audience as unknown as Record<string, unknown>,
    templateKey: def.key,
    copySource: source,
    subject: out.subject,
    previewText: out.previewText,
    blocks: out.blocks,
    theme: out.theme,
    warnings: out.warnings,
  }));

  await db.delete(autopilotProposals).where(and(eq(autopilotProposals.workspaceId, workspace.id), eq(autopilotProposals.status, "PROPOSED")));
  if (rows.length) await db.insert(autopilotProposals).values(rows);
  return { proposals: rows.length, kind: profile.kind, ai: useAi };
}
