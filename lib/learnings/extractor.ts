import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import type { LearningAction } from "./types";

const ExtractSchema = z.object({
  pattern: z.string(),
  context: z.string(),
  action: z.enum(["prefer", "suppress", "escalate"]),
});

const MODEL = process.env.CLAWGUARD_LEARNING_MODEL ?? "openai/gpt-4o-mini";

/**
 * Turn a natural-language PR comment into a structured learning row.
 */
export async function extractLearningFromComment(
  comment: string
): Promise<{ pattern: string; context: string; action: LearningAction } | null> {
  const trimmed = comment.trim();
  if (trimmed.length < 8) return null;

  try {
    const { object } = await generateObject({
      model: gateway(MODEL),
      schema: ExtractSchema,
      prompt: [
        "Extract ONE team learning from a developer's reply to a security bot.",
        "pattern: short imperative rule (e.g. 'Parameterized queries in API routes are OK').",
        "context: when it applies (e.g. 'We use ORM middleware').",
        "action: prefer = reinforce; suppress = reduce false positives; escalate = always flag harder.",
        "",
        "Comment:",
        trimmed.slice(0, 4000),
      ].join("\n"),
    });
    return object;
  } catch (e) {
    console.error("[learnings/extractor] failed:", e);
    return {
      pattern: trimmed.slice(0, 200),
      context: "User feedback on a prior finding.",
      action: "prefer",
    };
  }
}
