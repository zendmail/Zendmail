import "server-only";
import { z } from "zod";
import { aiComplete } from "./provider";
import { newBlockId } from "@/lib/email-blocks";
import type { EmailBlock } from "@/db/schema";

const aiBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), text: z.string() }),
  z.object({ type: z.literal("text"), html: z.string() }),
  z.object({ type: z.literal("button"), label: z.string(), url: z.string().default("https://example.com") }),
  z.object({ type: z.literal("footer"), text: z.string() }),
]);

const aiEmailSchema = z.object({
  subject: z.string(),
  previewText: z.string(),
  blocks: z.array(aiBlockSchema).min(1).max(8),
});

export type GeneratedEmail = {
  subject: string;
  previewText: string;
  blocks: EmailBlock[];
};

const SYSTEM_PROMPT = `You are an email marketing copywriter for Zendmail, an AI-powered email marketing platform.
Given a business's request, write a complete marketing email.

Respond with ONLY valid JSON (no markdown fences, no commentary) matching exactly this shape:
{
  "subject": string,
  "previewText": string (under 120 characters),
  "blocks": [
    { "type": "heading", "text": string },
    { "type": "text", "html": string, // 1-2 short paragraphs, plain <p> tags only },
    { "type": "button", "label": string, "url": "https://example.com" },
    { "type": "footer", "text": string // one short sentence about why they're receiving this }
  ]
}
Always include exactly one heading, one text block, one button, and one footer, in that order.
Keep copy concise, concrete, and free of hype/spam words. Do not invent specific discount codes unless the user gave one.`;

function parseAiJson(raw: string) {
  // Models sometimes wrap JSON in ```json fences despite instructions — strip defensively.
  const cleaned = raw.replace(/```json\s*|```\s*$/g, "").trim();
  return JSON.parse(cleaned);
}

function toEmailBlocks(blocks: z.infer<typeof aiBlockSchema>[]): EmailBlock[] {
  return blocks.map((b): EmailBlock => {
    const id = newBlockId();
    switch (b.type) {
      case "heading":
        return { id, type: "heading", text: b.text };
      case "text":
        return { id, type: "text", html: b.html };
      case "button":
        return { id, type: "button", label: b.label, url: b.url };
      case "footer":
        return { id, type: "footer", text: b.text };
    }
  });
}

export async function generateEmail(instruction: string): Promise<GeneratedEmail> {
  const raw = await aiComplete({ system: SYSTEM_PROMPT, prompt: instruction });
  const json = parseAiJson(raw);
  const parsed = aiEmailSchema.parse(json);
  return { subject: parsed.subject, previewText: parsed.previewText, blocks: toEmailBlocks(parsed.blocks) };
}

const TRANSFORM_PROMPTS: Record<string, string> = {
  shorten: "Make this email noticeably shorter while keeping the core message and call to action.",
  expand: "Expand this email with a bit more detail and warmth, while staying concise overall.",
  professional: "Rewrite this email in a more professional, polished tone.",
  friendly: "Rewrite this email in a warmer, more casual and friendly tone.",
  improve: "Improve the clarity, persuasiveness, and flow of this email without changing its core message.",
};

export async function transformEmail(current: GeneratedEmail, transform: keyof typeof TRANSFORM_PROMPTS | string, targetLanguage?: string) {
  const instruction =
    transform === "translate" && targetLanguage
      ? `Translate this email into ${targetLanguage}, keeping the same structure.`
      : TRANSFORM_PROMPTS[transform] ?? "Improve this email.";

  const prompt = `${instruction}\n\nCurrent email JSON:\n${JSON.stringify({
    subject: current.subject,
    previewText: current.previewText,
    blocks: current.blocks,
  })}\n\nRespond with the same JSON shape as before, fully rewritten.`;

  const raw = await aiComplete({ system: SYSTEM_PROMPT, prompt });
  const json = parseAiJson(raw);
  const parsed = aiEmailSchema.parse(json);
  return { subject: parsed.subject, previewText: parsed.previewText, blocks: toEmailBlocks(parsed.blocks) };
}
