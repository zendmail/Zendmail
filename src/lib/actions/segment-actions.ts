"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { segments, segmentRules } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { recordAuditLog } from "@/lib/audit";
import { segmentSchema, ruleSchema } from "@/lib/validation/segments";
import { countSegmentMatches, type RuleInput } from "@/lib/segments";

async function requireWorkspaceId() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");
  return { userId: user.id, workspaceId: workspace.id };
}

/** Parses the repeated rule[n].field / rule[n].operator / rule[n].value fields a form posts. */
function parseRulesFromFormData(formData: FormData): RuleInput[] {
  const fields = formData.getAll("rule_field");
  const operators = formData.getAll("rule_operator");
  const values = formData.getAll("rule_value");

  const rules: RuleInput[] = [];
  for (let i = 0; i < fields.length; i++) {
    const parsed = ruleSchema.safeParse({
      field: fields[i],
      operator: operators[i],
      value: values[i] ?? "",
    });
    if (parsed.success) rules.push(parsed.data);
  }
  return rules;
}

export type PreviewResult = { count?: number; error?: string };

export async function previewSegmentAction(formData: FormData): Promise<PreviewResult> {
  const { workspaceId } = await requireWorkspaceId();
  const matchType = formData.get("matchType") === "ANY" ? "ANY" : "ALL";
  const rules = parseRulesFromFormData(formData);

  if (rules.length === 0) return { error: "Add at least one condition to preview." };

  const count = await countSegmentMatches(workspaceId, rules, matchType);
  return { count };
}

export type SegmentActionState = { error?: string; success?: string } | undefined;

export async function createSegmentAction(
  _prev: SegmentActionState,
  formData: FormData
): Promise<SegmentActionState> {
  const { userId, workspaceId } = await requireWorkspaceId();

  const matchType = formData.get("matchType") === "ANY" ? "ANY" : "ALL";
  const rules = parseRulesFromFormData(formData);

  const parsed = segmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    matchType,
    rules,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const [existing] = await db
    .select({ id: segments.id })
    .from(segments)
    .where(and(eq(segments.workspaceId, workspaceId), eq(segments.name, parsed.data.name)))
    .limit(1);

  if (existing) {
    return { error: "A segment with this name already exists." };
  }

  const [segment] = await db
    .insert(segments)
    .values({
      workspaceId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      matchType: parsed.data.matchType,
    })
    .returning();

  await db.insert(segmentRules).values(
    parsed.data.rules.map((r) => ({
      segmentId: segment.id,
      field: r.field,
      operator: r.operator,
      value: r.value,
    }))
  );

  await recordAuditLog({ action: "segment.created", userId, workspaceId, metadata: { segmentId: segment.id } });
  revalidatePath("/segments");
  redirect(`/segments/${segment.id}`);
}

export async function deleteSegmentAction(formData: FormData) {
  const { userId, workspaceId } = await requireWorkspaceId();
  const id = String(formData.get("id"));

  await db
    .update(segments)
    .set({ deletedAt: new Date() })
    .where(and(eq(segments.id, id), eq(segments.workspaceId, workspaceId)));

  await recordAuditLog({ action: "segment.deleted", userId, workspaceId, metadata: { segmentId: id } });
  revalidatePath("/segments");
  redirect("/segments");
}
