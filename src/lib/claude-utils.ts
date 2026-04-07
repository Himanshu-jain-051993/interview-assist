
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-3-5-sonnet-20240620";

/**
 * Standard Claude execution utility.
 * Assumes ANTHROPIC_API_KEY is available in process.env.
 */
export async function runClaudeRequest(
  prompt: string, 
  systemPrompt: string = "You are an expert recruitment assistant.",
  model: string = DEFAULT_MODEL
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });

  try {
    console.log(`[Claude-Utils] Calling ${model}...`);
    const message = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    throw new Error("Unexpected content type from Claude response.");
  } catch (err: any) {
    console.error("[Claude-Utils] Error:", err.message);
    throw err;
  }
}

/**
 * Helper to process JSON response from Claude (Claude usually wraps it in code blocks).
 */
export function extractJsonFromClaude(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON found in Claude response.");
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[Claude-Utils] JSON Parse error on text:", text.substring(0, 500));
    throw new Error("Failed to parse AI response as JSON.");
  }
}
