import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import type { Intent } from "@/lib/intent-types";

const INTENT_MODEL =
  process.env.CLAWGUARD_INTENT_MODEL ?? "openai/gpt-4o-mini";

export async function classifyIntentWithLlm(
  body: string,
  botName: string
): Promise<Intent | null> {
  const mention = `@${botName.toLowerCase()}`;
  if (!body.toLowerCase().includes(mention)) {
    return null;
  }

  try {
    const { text } = await generateText({
      model: gateway(INTENT_MODEL),
      prompt: `Classify the user's GitHub PR comment intent for bot "${botName}".

Reply with EXACTLY one line, one of:
FIX_ALL
FIX_TARGET:<keyword>
RE_AUDIT
UNKNOWN

Rules:
- FIX_ALL: wants to fix all critical/high issues or says "fix all"
- FIX_TARGET: wants to fix one issue type (e.g. sql injection, CWE-89) — put short keyword after colon
- RE_AUDIT: wants rescan, re-audit, review, scan again
- UNKNOWN: else

Comment:
${body.slice(0, 2000)}`,
      maxOutputTokens: 64,
    });

    const line = text.trim().split("\n")[0]?.trim() ?? "";
    if (line.startsWith("FIX_ALL")) return { type: "fix-all" };
    if (line.startsWith("FIX_TARGET:")) {
      const target = line.slice("FIX_TARGET:".length).trim();
      if (target) return { type: "fix-finding", target };
    }
    if (line.startsWith("RE_AUDIT")) return { type: "re-audit" };
    return null;
  } catch {
    return null;
  }
}
