import "server-only";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI features require AI_PROVIDER_API_KEY to be set in the environment.");
    this.name = "AiNotConfiguredError";
  }
}

interface AiProvider {
  complete(input: { system: string; prompt: string }): Promise<string>;
}

/**
 * Talks to the Anthropic Messages API directly over fetch — no SDK
 * dependency needed for a single non-streaming call. Swap this class
 * (and the export at the bottom) to change providers later; nothing
 * outside this file should know which provider is in use or read the
 * API key directly.
 */
class AnthropicProvider implements AiProvider {
  async complete({ system, prompt }: { system: string; prompt: string }): Promise<string> {
    const apiKey = process.env.AI_PROVIDER_API_KEY;
    if (!apiKey) throw new AiNotConfiguredError();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`AI provider request failed (${response.status}): ${body.slice(0, 300)}`);
    }

    const data = await response.json();
    const text = data.content
      ?.filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("\n");

    if (!text) throw new Error("AI provider returned an empty response.");
    return text;
  }
}

const provider: AiProvider = new AnthropicProvider();

export async function aiComplete(input: { system: string; prompt: string }) {
  return provider.complete(input);
}
