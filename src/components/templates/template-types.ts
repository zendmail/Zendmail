import type { templateCategory } from "@/db/schema";

/** The slice of a template the gallery needs. Block content is fetched on demand for previews, never shipped in bulk. */
export type TemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  category: (typeof templateCategory.enumValues)[number];
  tier: "FREE" | "PRO";
  subject: string | null;
  isBuiltIn: boolean;
};
