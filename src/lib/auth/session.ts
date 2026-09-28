import "server-only";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { generateToken, hashToken } from "./crypto";

const SESSION_COOKIE = "zendmail_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function createSession(userId: string) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const hdrs = await headers();

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    userAgent: hdrs.get("user-agent") ?? undefined,
    ipAddress: hdrs.get("x-forwarded-for") ?? undefined,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }

  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Resolves the current request's session to a user, or null.
 * Also lazily deletes expired sessions rather than trusting the cookie.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);

  const [row] = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!row) return null;

  if (row.session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, row.session.id));
    return null;
  }

  if (row.user.deletedAt) return null;

  return row.user;
}

export { SESSION_COOKIE };
