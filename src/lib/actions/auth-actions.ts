"use server";

import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users, verificationTokens } from "@/db/schema";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
} from "@/lib/auth/crypto";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { recordAuditLog } from "@/lib/audit";
import {
  signUpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { appUrl } from "@/lib/app-url";
import { rateLimit, rateLimitByKey } from "@/lib/rate-limit";

export type ActionState = { error?: string; success?: string } | undefined;

const VERIFY_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const limit = await rateLimit("signup", 10, 60 * 60); // 10 signups per IP per hour
  if (!limit.allowed) return { error: limit.message };

  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { name, email, password } = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    // Same message as a real failure so this endpoint can't be used to
    // enumerate which emails already have accounts.
    return { error: "Something went wrong. Try logging in instead." };
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning();

  const token = generateToken();
  await db.insert(verificationTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    type: "EMAIL_VERIFY",
    expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
  });

  await sendVerificationEmail(email, appUrl(`/verify-email?token=${token}`));
  await recordAuditLog({ action: "auth.signup", userId: user.id });
  await createSession(user.id);

  redirect("/verify-email/pending");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ipLimit = await rateLimit("login", 20, 15 * 60); // 20 attempts per IP per 15 min
  if (!ipLimit.allowed) return { error: ipLimit.message };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { email, password } = parsed.data;

  const emailLimit = await rateLimitByKey("login", email, 8, 15 * 60); // 8 attempts per account per 15 min, regardless of IP
  if (!emailLimit.allowed) return { error: emailLimit.message };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Constant-shaped failure whether the email exists or the password is
  // wrong, so login can't be used to enumerate registered accounts.
  if (!user || user.deletedAt) {
    return { error: "Incorrect email or password." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Incorrect email or password." };
  }

  if (user.suspendedAt) {
    return { error: "This account has been suspended. Contact support for help." };
  }

  await createSession(user.id);
  await recordAuditLog({ action: "auth.login", userId: user.id });

  redirect("/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await recordAuditLog({ action: "auth.logout", userId: user.id });
  }
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ipLimit = await rateLimit("forgot-password", 10, 60 * 60); // 10 per IP per hour
  if (!ipLimit.allowed) return { error: ipLimit.message };

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const { email } = parsed.data;

  // Limited by the target email too, not just the requester's IP — this
  // is the endpoint most attractive to abuse as an email bomb against a
  // specific victim, so cap it independent of which IP is sending requests.
  const emailLimit = await rateLimitByKey("forgot-password", email, 4, 60 * 60); // 4 per account per hour
  if (!emailLimit.allowed) {
    // Same success-shaped response as normal — an attacker probing this
    // endpoint shouldn't be able to tell rate-limiting from "email sent".
    return { success: "If that email has an account, we've sent a reset link." };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Always report success — confirming or denying an account's existence
  // here would leak which emails are registered.
  if (user) {
    const token = generateToken();
    await db.insert(verificationTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      type: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });
    await sendPasswordResetEmail(email, appUrl(`/reset-password?token=${token}`));
    await recordAuditLog({ action: "auth.password_reset_requested", userId: user.id });
  }

  return { success: "If that email has an account, we've sent a reset link." };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.tokenHash, tokenHash), eq(verificationTokens.type, "PASSWORD_RESET")))
    .limit(1);

  if (!row || row.consumedAt || row.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
  await db.update(verificationTokens).set({ consumedAt: new Date() }).where(eq(verificationTokens.id, row.id));
  await recordAuditLog({ action: "auth.password_reset_completed", userId: row.userId });

  redirect("/login?reset=success");
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashToken(token);

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.tokenHash, tokenHash), eq(verificationTokens.type, "EMAIL_VERIFY")))
    .limit(1);

  if (!row || row.consumedAt || row.expiresAt < new Date()) {
    return { ok: false as const };
  }

  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
  await db.update(verificationTokens).set({ consumedAt: new Date() }).where(eq(verificationTokens.id, row.id));
  await recordAuditLog({ action: "auth.email_verified", userId: row.userId });

  return { ok: true as const };
}

export async function resendVerificationEmailAction(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/onboarding/create");

  const token = generateToken();
  await db.insert(verificationTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    type: "EMAIL_VERIFY",
    expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
  });

  await sendVerificationEmail(user.email, appUrl(`/verify-email?token=${token}`));
  await recordAuditLog({ action: "auth.verification_email_resent", userId: user.id });

  return { success: "We've sent a new verification link to your email." };
}
