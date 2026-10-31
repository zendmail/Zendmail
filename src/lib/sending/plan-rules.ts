import { isPaidPlanName } from "@/lib/template-access";

/**
 * Free workspaces send from Zendmail's shared sending domain (under their own business name), so one
 * workspace's spam complaints can hurt everyone on it. They get a small rolling 24-hour allowance and
 * cannot add their own domains. Paid plans send from their own authenticated domain.
 */
export const FREE_DAILY_SEND_LIMIT = 50;

export function canUseCustomDomain(planName: string | null | undefined) {
  return isPaidPlanName(planName);
}

export type DailyAllowance = { limit: number | null; sentLast24h: number; remaining: number | null };

/** `limit` is null for paid plans (the plan's monthly limit applies instead). */
export function dailyAllowance(planName: string | null | undefined, sentLast24h: number): DailyAllowance {
  if (canUseCustomDomain(planName)) return { limit: null, sentLast24h, remaining: null };
  return { limit: FREE_DAILY_SEND_LIMIT, sentLast24h, remaining: Math.max(0, FREE_DAILY_SEND_LIMIT - sentLast24h) };
}
