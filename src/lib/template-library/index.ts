import { FREE_TEMPLATES } from "./free";
import { PRO_TEMPLATES } from "./pro";
import type { TemplateDefinition } from "./helpers";

export type { TemplateDefinition } from "./helpers";

/** Every built-in template, in display order. Add new ones to free.ts / pro.ts — keys must stay unique and stable. */
export const TEMPLATE_LIBRARY: TemplateDefinition[] = [...FREE_TEMPLATES, ...PRO_TEMPLATES].sort((a, b) => a.sortOrder - b.sortOrder);

export const FREE_TEMPLATE_COUNT = FREE_TEMPLATES.length;
export const PRO_TEMPLATE_COUNT = PRO_TEMPLATES.length;
