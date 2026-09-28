"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { contacts, tags, contactTags } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { createContactSchema, updateContactSchema, csvRowSchema } from "@/lib/validation/contacts";
import { csvToContactRows } from "@/lib/csv";
import { findExistingEmails } from "@/lib/contacts";
import { triggerAutomations } from "@/lib/automation-engine";
import type { ActionState } from "@/lib/actions/auth-actions";

async function requireWorkspaceId() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspaceId: workspace.id };
}

export async function createContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, workspaceId } = await requireWorkspaceId();

  const parsed = createContactSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
    phone: formData.get("phone") || undefined,
    status: formData.get("status") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, workspaceId), eq(contacts.email, parsed.data.email)))
    .limit(1);

  if (existing) {
    return { error: "A contact with this email already exists." };
  }

  const [contact] = await db
    .insert(contacts)
    .values({
      workspaceId,
      email: parsed.data.email,
      firstName: parsed.data.firstName || null,
      lastName: parsed.data.lastName || null,
      phone: parsed.data.phone || null,
      status: parsed.data.status,
      source: "manual",
    })
    .returning();

  await recordAuditLog({ action: "contact.created", userId, workspaceId, metadata: { contactId: contact.id } });
  await triggerAutomations(workspaceId, contact.id, { type: "CONTACT_CREATED" });
  revalidatePath("/contacts");
  redirect(`/contacts/${contact.id}`);
}

export async function updateContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, workspaceId } = await requireWorkspaceId();

  const parsed = updateContactSchema.safeParse({
    id: formData.get("id"),
    email: formData.get("email"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
    phone: formData.get("phone") || undefined,
    status: formData.get("status") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { id, ...values } = parsed.data;

  await db
    .update(contacts)
    .set({
      email: values.email,
      firstName: values.firstName || null,
      lastName: values.lastName || null,
      phone: values.phone || null,
      status: values.status,
      updatedAt: new Date(),
    })
    .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));

  await recordAuditLog({ action: "contact.updated", userId, workspaceId, metadata: { contactId: id } });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { success: "Contact updated." };
}

export async function deleteContactAction(formData: FormData) {
  const { userId, workspaceId } = await requireWorkspaceId();
  const id = String(formData.get("id"));

  await db
    .update(contacts)
    .set({ deletedAt: new Date() })
    .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));

  await recordAuditLog({ action: "contact.deleted", userId, workspaceId, metadata: { contactId: id } });
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function addTagToContactAction(formData: FormData) {
  const { workspaceId } = await requireWorkspaceId();
  const contactId = String(formData.get("contactId"));
  const rawName = String(formData.get("tagName") || "").trim();
  if (!rawName) return;

  let [tag] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.workspaceId, workspaceId), eq(tags.name, rawName)))
    .limit(1);

  if (!tag) {
    [tag] = await db.insert(tags).values({ workspaceId, name: rawName }).returning();
  }

  await db.insert(contactTags).values({ contactId, tagId: tag.id }).onConflictDoNothing();
  await triggerAutomations(workspaceId, contactId, { type: "TAG_ADDED", tagName: tag.name });
  revalidatePath(`/contacts/${contactId}`);
}

export async function removeTagFromContactAction(formData: FormData) {
  await requireWorkspaceId();
  const contactId = String(formData.get("contactId"));
  const tagId = String(formData.get("tagId"));

  await db.delete(contactTags).where(and(eq(contactTags.contactId, contactId), eq(contactTags.tagId, tagId)));
  revalidatePath(`/contacts/${contactId}`);
}

export type ImportResult = {
  error?: string;
  success?: string;
  imported?: number;
  skippedInvalid?: number;
  skippedDuplicate?: number;
};

export async function importContactsCsvAction(
  _prev: ImportResult | undefined,
  formData: FormData
): Promise<ImportResult> {
  const { userId, workspaceId } = await requireWorkspaceId();

  const file = formData.get("file");
  const consentConfirmed = formData.get("consentConfirmed") === "on";

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to import." };
  }
  if (!consentConfirmed) {
    return { error: "You must confirm these contacts consented to receive marketing emails." };
  }

  const text = await file.text();
  const { rows, skipped: headerSkipped } = csvToContactRows(text);

  if (rows.length === 0) {
    return { error: "No valid rows found. Make sure the CSV has an email column." };
  }

  const validRows = [];
  let skippedInvalid = headerSkipped;

  for (const row of rows) {
    const parsed = csvRowSchema.safeParse(row);
    if (parsed.success) {
      validRows.push(parsed.data);
    } else {
      skippedInvalid++;
    }
  }

  const emails = validRows.map((r) => r.email);
  const existing = await findExistingEmails(workspaceId, emails);
  const toInsert = validRows.filter((r) => !existing.has(r.email));
  const skippedDuplicate = validRows.length - toInsert.length;

  if (toInsert.length > 0) {
    const inserted = await db
      .insert(contacts)
      .values(
        toInsert.map((r) => ({
          workspaceId,
          email: r.email,
          firstName: r.firstName || null,
          lastName: r.lastName || null,
          phone: r.phone || null,
          status: "SUBSCRIBER" as const,
          consentStatus: "GRANTED" as const,
          consentSource: "CSV_IMPORT" as const,
          consentedAt: new Date(),
          source: "csv_import",
        }))
      )
      .returning({ id: contacts.id });

    for (const row of inserted) {
      await triggerAutomations(workspaceId, row.id, { type: "CONTACT_CREATED" });
    }
  }

  await recordAuditLog({
    action: "contact.csv_imported",
    userId,
    workspaceId,
    metadata: { imported: toInsert.length, skippedInvalid, skippedDuplicate },
  });

  revalidatePath("/contacts");

  return {
    success: `Imported ${toInsert.length} contact${toInsert.length === 1 ? "" : "s"}.`,
    imported: toInsert.length,
    skippedInvalid,
    skippedDuplicate,
  };
}
