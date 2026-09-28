import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Platform-admin check, distinct from workspace membership roles. A
 * non-admin (including a workspace OWNER) gets redirected to their own
 * dashboard rather than a 404 — this app doesn't treat the existence of
 * an admin panel as sensitive, just who can act on it.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
