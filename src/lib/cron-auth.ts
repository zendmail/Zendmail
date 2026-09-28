import "server-only";

/**
 * Cron endpoints must never be publicly callable — anyone who could hit
 * them could trigger mass sends or repeatedly drain the automation
 * queue. Vercel Cron sends this exact header format automatically; any
 * other scheduler (systemd timer, GitHub Actions, a queue) just needs to
 * send the same bearer token.
 */
export function isAuthorizedCronRequest(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not set — refusing all cron requests until it's configured.");
    return false;
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
