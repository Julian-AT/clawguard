/**
 * Chat SDK mention detection uses `@${userName}\b`. That does not match `@clawguardbot`
 * when `userName` is `clawguard` (no word boundary between `d` and `b`). We register an
 * extra pattern for alternate @handles (GitHub App slug is often `somethingbot`).
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** All lowercase handles (no @) that should trigger the same behavior as onNewMention. */
export function collectBotMentionHandles(primaryFromEnv: string): string[] {
  const handles = new Set<string>();
  const primary = primaryFromEnv.trim().toLowerCase() || "clawguard";
  handles.add(primary);

  for (const part of (process.env.GITHUB_BOT_MENTION_ALIASES ?? "").split(",")) {
    const t = part.trim().toLowerCase();
    if (t) {
      handles.add(t);
    }
  }

  // Common mismatch: env left as "clawguard" but GitHub shows @clawguardbot
  if (handles.has("clawguard") && !handles.has("clawguardbot")) {
    handles.add("clawguardbot");
  }

  return [...handles].sort((a, b) => b.length - a.length);
}

export function buildGithubMentionFallbackPattern(handles: string[]): RegExp {
  return new RegExp(`@(?:${handles.map(escapeRegex).join("|")})\\b`, "i");
}

/** Use raw API comment body — Chat SDK `message.text` can omit @mentions after markdown→plain conversion. */
export function commentBodyMentionsBot(body: string, handles: string[]): boolean {
  if (!body.trim()) {
    return false;
  }
  return buildGithubMentionFallbackPattern(handles).test(body);
}
