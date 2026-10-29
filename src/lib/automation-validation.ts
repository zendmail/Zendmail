export type StepForCheck = { order: number; type: string; config: unknown };

/**
 * Returns a plain-language reason an automation is not ready to go live, or null when it is. Pure so it can be tested;
 * `usableTemplateIds` is the set of templates the workspace may send (its own plus the built-in library).
 */
export function findAutomationIssue(steps: StepForCheck[], usableTemplateIds: ReadonlySet<string>): string | null {
  if (steps.length === 0) return "Add at least one step before activating.";
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  for (let i = 0; i < ordered.length; i++) {
    const n = i + 1;
    const config = (ordered[i].config ?? {}) as Record<string, unknown>;
    switch (ordered[i].type) {
      case "SEND_EMAIL": {
        const id = typeof config.templateId === "string" ? config.templateId : "";
        if (!id) return `Step ${n} (Send email) has no template. Choose one or delete the step.`;
        if (!usableTemplateIds.has(id)) return `Step ${n} (Send email) uses a template that no longer exists. Choose another.`;
        break;
      }
      case "WAIT": {
        const minutes = Number(config.minutes);
        if (!Number.isFinite(minutes) || minutes <= 0) return `Step ${n} (Wait) needs a time greater than 0.`;
        break;
      }
      case "ADD_TAG":
      case "REMOVE_TAG": {
        const tag = typeof config.tagName === "string" ? config.tagName.trim() : "";
        if (!tag) return `Step ${n} (${ordered[i].type === "ADD_TAG" ? "Add tag" : "Remove tag"}) needs a tag name.`;
        break;
      }
    }
  }
  return null;
}
