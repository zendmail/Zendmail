import "server-only";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  automations,
  automationSteps,
  automationRuns,
  automationEvents,
  contacts,
  contactTags,
  tags,
  workspaces,
  emailTemplates,
  type AutomationStepConfig,
} from "@/db/schema";
import { renderBlocksToHtml, renderBlocksToText } from "./email-blocks";
import { sendCampaignEmail } from "./email";
import { getVerifiedDomainNames } from "./sending-domains/service";
import type { EmailBlock } from "@/db/schema";

/**
 * Called whenever something happens that an automation might react to
 * (a contact is created, a tag is added). Finds matching ACTIVE
 * automations in the workspace and starts a run for this contact, then
 * immediately drives that run forward until it hits a WAIT step or
 * finishes — so instant steps (tag actions, sends with no wait) fire
 * right away instead of waiting for the next processDueRuns sweep.
 */
export async function triggerAutomations(
  workspaceId: string,
  contactId: string,
  event: { type: "CONTACT_CREATED" } | { type: "TAG_ADDED"; tagName: string }
) {
  const candidates = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.workspaceId, workspaceId),
        eq(automations.status, "ACTIVE"),
        eq(automations.triggerType, event.type)
      )
    );

  const matching = candidates.filter((a) => {
    if (event.type === "TAG_ADDED") {
      return (a.triggerConfig?.tagName ?? "").toLowerCase() === event.tagName.toLowerCase();
    }
    return true;
  });

  for (const automation of matching) {
    const [run] = await db
      .insert(automationRuns)
      .values({ automationId: automation.id, contactId, currentStepIndex: 0, status: "ACTIVE" })
      .returning();
    await advanceRun(run.id);
  }
}

/**
 * Processes every run that's due (status ACTIVE/WAITING with
 * nextRunAt <= now). In production this is invoked by a background
 * worker/cron; here it's exposed as a manual "Process due steps"
 * action on the Automations page, same architecture note as campaign
 * scheduling.
 */
export async function processDueRuns(workspaceId: string) {
  const dueRuns = await db
    .select({ id: automationRuns.id })
    .from(automationRuns)
    .innerJoin(automations, eq(automationRuns.automationId, automations.id))
    .where(
      and(
        eq(automations.workspaceId, workspaceId),
        sql`${automationRuns.status} in ('ACTIVE', 'WAITING')`,
        lte(automationRuns.nextRunAt, new Date())
      )
    );

  let processed = 0;
  for (const run of dueRuns) {
    await advanceRun(run.id);
    processed++;
  }
  return processed;
}

/**
 * Same sweep as processDueRuns but across every workspace — the version
 * a real scheduler calls (see /api/cron/process-automations), since a
 * cron job runs once for the whole platform, not once per tenant.
 */
export async function processDueRunsGlobal() {
  const dueRuns = await db
    .select({ id: automationRuns.id })
    .from(automationRuns)
    .where(and(sql`${automationRuns.status} in ('ACTIVE', 'WAITING')`, lte(automationRuns.nextRunAt, new Date())));

  let processed = 0;
  for (const run of dueRuns) {
    try {
      await advanceRun(run.id);
      processed++;
    } catch (err) {
      console.error(`Failed to advance automation run ${run.id}:`, err);
    }
  }
  return processed;
}

/** Walks a run forward through steps until it hits a WAIT, completes, or fails. */
async function advanceRun(runId: string) {
  for (let guard = 0; guard < 50; guard++) {
    const [run] = await db.select().from(automationRuns).where(eq(automationRuns.id, runId)).limit(1);
    if (!run || run.status === "COMPLETED" || run.status === "FAILED") return;
    if (run.status === "WAITING" && run.nextRunAt > new Date()) return;

    const steps = await db
      .select()
      .from(automationSteps)
      .where(eq(automationSteps.automationId, run.automationId))
      .orderBy(automationSteps.order);

    if (run.currentStepIndex >= steps.length) {
      await db.update(automationRuns).set({ status: "COMPLETED", updatedAt: new Date() }).where(eq(automationRuns.id, runId));
      await db.insert(automationEvents).values({ runId, stepIndex: run.currentStepIndex, type: "run_completed" });
      return;
    }

    const step = steps[run.currentStepIndex];

    try {
      await executeStep(run.contactId, step.type, step.config);
    } catch (err) {
      await db.update(automationRuns).set({ status: "FAILED", updatedAt: new Date() }).where(eq(automationRuns.id, runId));
      await db.insert(automationEvents).values({
        runId,
        stepIndex: run.currentStepIndex,
        type: "run_failed",
        metadata: { error: err instanceof Error ? err.message : String(err) },
      });
      return;
    }

    await db.insert(automationEvents).values({ runId, stepIndex: run.currentStepIndex, type: "step_completed" });

    if (step.type === "WAIT") {
      const minutes = (step.config as { minutes: number }).minutes ?? 0;
      await db
        .update(automationRuns)
        .set({
          status: "WAITING",
          currentStepIndex: run.currentStepIndex + 1,
          nextRunAt: new Date(Date.now() + minutes * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(automationRuns.id, runId));
      return; // stop here; will resume once due
    }

    await db
      .update(automationRuns)
      .set({ status: "ACTIVE", currentStepIndex: run.currentStepIndex + 1, nextRunAt: new Date(), updatedAt: new Date() })
      .where(eq(automationRuns.id, runId));
    // loop continues to process the next step immediately
  }
}

async function executeStep(contactId: string, type: string, config: AutomationStepConfig) {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) throw new Error("Contact not found");

  switch (type) {
    case "SEND_EMAIL": {
      const { templateId } = config as { templateId: string };
      const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, templateId)).limit(1);
      if (!template) throw new Error("Template not found");
      if (contact.consentStatus !== "GRANTED") return; // silently skip — no consent, no send

      const blocks = template.blocks as EmailBlock[];
      const [workspaceRow] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, contact.workspaceId)).limit(1);
      const verifiedDomains = await getVerifiedDomainNames(contact.workspaceId);
      await sendCampaignEmail({
        to: contact.email,
        fromName: workspaceRow?.name ?? "Zendmail",
        // On a verified domain automations send as hello@thatdomain; otherwise the shared sender is used.
        fromEmail: verifiedDomains[0] ? `hello@${verifiedDomains[0]}` : "automations@zendmail.demo",
        verifiedDomains,
        subject: template.subject ?? "",
        html: renderBlocksToHtml(blocks),
        text: renderBlocksToText(blocks),
      });
      return;
    }
    case "WAIT":
      return; // handled by the caller (sets nextRunAt)
    case "ADD_TAG": {
      const { tagName } = config as { tagName: string };
      let [tag] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.workspaceId, contact.workspaceId), eq(tags.name, tagName)))
        .limit(1);
      if (!tag) [tag] = await db.insert(tags).values({ workspaceId: contact.workspaceId, name: tagName }).returning();
      await db.insert(contactTags).values({ contactId, tagId: tag.id }).onConflictDoNothing();
      return;
    }
    case "REMOVE_TAG": {
      const { tagName } = config as { tagName: string };
      const [tag] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.workspaceId, contact.workspaceId), eq(tags.name, tagName)))
        .limit(1);
      if (tag) await db.delete(contactTags).where(and(eq(contactTags.contactId, contactId), eq(contactTags.tagId, tag.id)));
      return;
    }
    default:
      throw new Error(`Unknown step type: ${type}`);
  }
}
