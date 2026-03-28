/**
 * Bodies the bot posts via the GitHub API when using a PAT (same user as token).
 * Without filtering these, webhooks would re-enter (cards mention @GITHUB_BOT_USERNAME).
 */
export function isClawGuardAutomatedCommentBody(body: string | undefined): boolean {
  if (!body?.trim()) {
    return false;
  }
  const t = body.trimStart();
  return (
    t.startsWith("## 🛡️ ClawGuard Security Audit") ||
    t.startsWith("## Auto-Fix Results") ||
    t.startsWith("**ClawGuard:") ||
    t.startsWith("Starting auto-fix for all") ||
    t.startsWith("❌ Something went wrong") ||
    t.startsWith("Fixing:") ||
    t.startsWith("Fixed:") ||
    t.startsWith("Could not auto-fix") ||
    t.startsWith("No audit results found") ||
    t.startsWith("Understood — I'll factor") ||
    t.startsWith("I couldn't extract a concrete learning") ||
    t.startsWith("| Finding | Status | Commit |") ||
    t.startsWith("Could not find a finding matching")
  );
}
