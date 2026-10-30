import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { contacts, signupConfirmations, signupForms, suppressionEntries } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit";
import { triggerAutomations } from "@/lib/automation-engine";
import { sendSignupConfirmationEmail } from "@/lib/email";
import { appUrl } from "@/lib/app-url";

const CONFIRM_TTL_MS = 48 * 3_600_000;
const RESEND_COOLDOWN_MS = 2 * 60_000;

export const signupFormSchema = z.object({
  name: z.string().trim().min(2, "Give the form a name (at least 2 characters).").max(80),
  title: z.string().trim().min(2, "Add a headline for the form.").max(100),
  description: z.string().trim().max(300, "Keep the description under 300 characters.").default(""),
  buttonLabel: z.string().trim().min(2, "Button text is too short.").max(30),
  successMessage: z.string().trim().max(200).default(""),
  collectName: z.boolean(),
  consentText: z.string().trim().min(10, "Write the consent wording people agree to.").max(300),
  doubleOptIn: z.boolean(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid colour."),
});
export type SignupFormInput = z.infer<typeof signupFormSchema>;

export const publicSignupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  firstName: z.string().trim().max(80).optional(),
});

export function newPublicId() {
  return randomBytes(9).toString("base64url");
}

export function defaultConsentText(businessName: string) {
  return `I agree to receive emails from ${businessName}. I can unsubscribe at any time.`;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function formPublicUrl(publicId: string) {
  return appUrl(`/f/${publicId}`);
}

/** Copy-paste snippet for any website. An iframe keeps our code and cookies out of the customer's page. */
export function embedSnippet(publicId: string, height = 420) {
  return `<iframe src="${formPublicUrl(publicId)}?embed=1" title="Signup form" width="100%" height="${height}" style="border:0;max-width:480px" loading="lazy"></iframe>`;
}

export async function getPublicForm(publicId: string) {
  if (!/^[A-Za-z0-9_-]{8,24}$/.test(publicId)) return null;
  const [form] = await db.select().from(signupForms).where(eq(signupForms.publicId, publicId)).limit(1);
  return form ?? null;
}

type Form = typeof signupForms.$inferSelect;

export type CompleteResult = "SUBSCRIBED" | "ALREADY" | "BLOCKED";

/**
 * Turns a verified signup into a real contact with recorded consent, then starts the welcome automation.
 * People who unsubscribed, bounced, complained or withdrew consent are never silently re-added.
 */
export async function completeSignup(input: { form: Form; email: string; firstName?: string | null; consentText: string }): Promise<CompleteResult> {
  const { form } = input;
  const email = input.email.toLowerCase();

  const [suppressed] = await db
    .select({ id: suppressionEntries.id })
    .from(suppressionEntries)
    .where(and(eq(suppressionEntries.workspaceId, form.workspaceId), eq(suppressionEntries.email, email)))
    .limit(1);
  if (suppressed) return "BLOCKED";

  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.workspaceId, form.workspaceId), eq(contacts.email, email)))
    .limit(1);

  const now = new Date();
  let contactId: string;

  if (existing) {
    if (existing.status === "UNSUBSCRIBED" || existing.status === "BOUNCED" || existing.consentStatus === "WITHDRAWN") return "BLOCKED";
    if (!existing.deletedAt && existing.consentStatus === "GRANTED") return "ALREADY";
    await db
      .update(contacts)
      .set({
        consentStatus: "GRANTED",
        consentSource: "SIGNUP_FORM",
        consentedAt: now,
        deletedAt: null,
        firstName: existing.firstName || input.firstName || null,
        updatedAt: now,
      })
      .where(eq(contacts.id, existing.id));
    contactId = existing.id;
  } else {
    const [created] = await db
      .insert(contacts)
      .values({
        workspaceId: form.workspaceId,
        email,
        firstName: input.firstName || null,
        status: "SUBSCRIBER",
        consentStatus: "GRANTED",
        consentSource: "SIGNUP_FORM",
        consentedAt: now,
        source: `form:${form.id}`,
      })
      .returning({ id: contacts.id });
    contactId = created.id;
  }

  await recordAuditLog({ action: "contact.signup", workspaceId: form.workspaceId, metadata: { contactId, formId: form.id, doubleOptIn: form.doubleOptIn, consentText: input.consentText } });
  await triggerAutomations(form.workspaceId, contactId, { type: "CONTACT_CREATED" });
  return "SUBSCRIBED";
}

/**
 * Handles a public submission. The caller always shows the same "check your inbox" style message, so the response
 * never reveals whether an address is already a contact.
 */
export async function submitSignup(input: { form: Form; workspaceName: string; email: string; firstName?: string | null }) {
  const { form } = input;
  const email = input.email.toLowerCase();

  if (!form.doubleOptIn) {
    await completeSignup({ form, email, firstName: input.firstName, consentText: form.consentText });
    return;
  }

  // Don't mail the same address again within a couple of minutes (double-clicks, bots).
  const [recent] = await db
    .select({ id: signupConfirmations.id })
    .from(signupConfirmations)
    .where(and(eq(signupConfirmations.formId, form.id), eq(signupConfirmations.email, email), isNull(signupConfirmations.confirmedAt), gt(signupConfirmations.createdAt, new Date(Date.now() - RESEND_COOLDOWN_MS))))
    .orderBy(desc(signupConfirmations.createdAt))
    .limit(1);
  if (recent) return;

  const token = randomBytes(32).toString("base64url");
  await db.insert(signupConfirmations).values({
    formId: form.id,
    workspaceId: form.workspaceId,
    email,
    firstName: input.firstName || null,
    consentText: form.consentText,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + CONFIRM_TTL_MS),
  });

  try {
    await sendSignupConfirmationEmail({ to: email, businessName: input.workspaceName, confirmUrl: appUrl(`/confirm-subscription/${token}`) });
  } catch (error) {
    // The person sees the same message either way; the failure is logged for the owner to act on (sender setup).
    console.error("Signup confirmation email failed:", error);
  }
}

export async function findPendingConfirmation(token: string) {
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return null;
  const [row] = await db
    .select()
    .from(signupConfirmations)
    .where(eq(signupConfirmations.tokenHash, hashToken(token)))
    .limit(1);
  return row ?? null;
}

export type ConfirmOutcome = "CONFIRMED" | "ALREADY" | "EXPIRED" | "INVALID" | "BLOCKED";

export async function confirmSignup(token: string): Promise<{ outcome: ConfirmOutcome; businessName?: string }> {
  const row = await findPendingConfirmation(token);
  if (!row) return { outcome: "INVALID" };
  const [form] = await db.select().from(signupForms).where(eq(signupForms.id, row.formId)).limit(1);
  if (!form) return { outcome: "INVALID" };
  if (row.confirmedAt) return { outcome: "ALREADY" };
  if (row.expiresAt.getTime() < Date.now()) return { outcome: "EXPIRED" };

  // Claim the token first so two clicks can't both create a welcome.
  const claimed = await db
    .update(signupConfirmations)
    .set({ confirmedAt: new Date() })
    .where(and(eq(signupConfirmations.id, row.id), isNull(signupConfirmations.confirmedAt)))
    .returning({ id: signupConfirmations.id });
  if (claimed.length === 0) return { outcome: "ALREADY" };

  const result = await completeSignup({ form, email: row.email, firstName: row.firstName, consentText: row.consentText });
  if (result === "BLOCKED") return { outcome: "BLOCKED" };
  return { outcome: result === "ALREADY" ? "ALREADY" : "CONFIRMED" };
}
