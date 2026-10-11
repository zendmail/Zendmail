/**
 * Free vs Pro template access. FREE templates are open to everyone; PRO templates can be previewed by
 * anyone but only used on a paid plan. Enforced server-side wherever a template is applied.
 */
export type TemplateTier = "FREE" | "PRO";

export function isPaidPlanName(planName: string | null | undefined) {
  return (planName ?? "free").trim().toLowerCase() !== "free";
}

export function canUseTemplate(planName: string | null | undefined, tier: TemplateTier) {
  return tier === "FREE" || isPaidPlanName(planName);
}
