import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * Generates an opaque random token for sessions / verification links.
 * We only ever store the SHA-256 hash of the token server-side — the raw
 * value goes in the cookie or email link and is never persisted, so a
 * database read alone can't be used to impersonate a session.
 */
export function generateToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isPasswordStrongEnough(password: string) {
  return password.length >= 8;
}
