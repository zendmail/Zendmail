import "server-only";
import { headers } from "next/headers";

interface Limiter {
  /** Returns true if the request should be ALLOWED, false if it should be blocked. */
  check(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}

/**
 * In-memory sliding-window limiter. Correct and sufficient for a single
 * long-running instance (one container, one server process). It is NOT
 * safe across multiple instances — each instance has its own counters,
 * so real limits are effectively (limit × instance count). Vercel and
 * other serverless/multi-instance platforms MUST configure
 * UPSTASH_REDIS_REST_URL/TOKEN (see below) before going live with more
 * than one instance.
 */
class InMemoryLimiter implements Limiter {
  private hits = new Map<string, number[]>();

  async check(key: string, limit: number, windowSeconds: number) {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const existing = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (existing.length >= limit) {
      this.hits.set(key, existing);
      return false;
    }

    existing.push(now);
    this.hits.set(key, existing);

    // Bound memory growth — sweep occasionally rather than on every call.
    if (Math.random() < 0.01) this.sweep(windowStart);
    return true;
  }

  private sweep(cutoff: number) {
    for (const [key, hits] of this.hits) {
      const kept = hits.filter((t) => t > cutoff);
      if (kept.length === 0) this.hits.delete(key);
      else this.hits.set(key, kept);
    }
  }
}

class RedisLimiter implements Limiter {
  private ratelimiters = new Map<string, import("@upstash/ratelimit").Ratelimit>();

  private async getLimiter(limit: number, windowSeconds: number) {
    const cacheKey = `${limit}:${windowSeconds}`;
    let rl = this.ratelimiters.get(cacheKey);
    if (rl) return rl;

    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    rl = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: "zendmail-ratelimit",
    });
    this.ratelimiters.set(cacheKey, rl);
    return rl;
  }

  async check(key: string, limit: number, windowSeconds: number) {
    const rl = await this.getLimiter(limit, windowSeconds);
    const result = await rl.limit(key);
    return result.success;
  }
}

const limiter: Limiter = process.env.UPSTASH_REDIS_REST_URL ? new RedisLimiter() : new InMemoryLimiter();

if (
  process.env.NODE_ENV === "production" &&
  !process.env.UPSTASH_REDIS_REST_URL &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL is not set — falling back to in-memory rate limiting, " +
      "which does NOT work correctly across multiple server instances. Set up Upstash Redis " +
      "before scaling beyond a single instance."
  );
}

async function getClientIp() {
  const h = await headers();
  // x-forwarded-for can contain a chain ("client, proxy1, proxy2") — the
  // first entry is the original client as seen by the first proxy hop.
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export type RateLimitResult = { allowed: boolean; message: string };

/**
 * Checks and consumes one attempt for `scope` (e.g. "login", "signup")
 * scoped to the caller's IP. Returns { allowed: false } once the limit
 * is hit — callers should return that as a normal form error, not throw.
 */
export async function rateLimit(scope: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const ip = await getClientIp();
  const allowed = await limiter.check(`${scope}:${ip}`, limit, windowSeconds);
  return {
    allowed,
    message: "Too many attempts. Please wait a few minutes and try again.",
  };
}

/** Additionally rate-limits by a target identifier (e.g. email) to stop one attacker hammering a single victim from rotating IPs. */
export async function rateLimitByKey(scope: string, targetKey: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const allowed = await limiter.check(`${scope}:${targetKey.toLowerCase()}`, limit, windowSeconds);
  return {
    allowed,
    message: "Too many attempts for this account. Please wait a few minutes and try again.",
  };
}
