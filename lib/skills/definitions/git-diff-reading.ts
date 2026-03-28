import type { SkillDefinition } from "@/lib/skills/types";

export const gitDiffReading: SkillDefinition = {
  id: "git-diff-reading",
  name: "Reading unified diffs",
  domain: "diff-reading",
  applicableTo: ["pr-summary", "code-quality", "*"],
  priority: 2,
  content: `Unified diff: lines with leading + are additions, - are removals, space is context. @@ hunk headers show old/new line numbers. Ignore pure renames until you confirm similarity. Binary files show as "Binary files differ". Focus on changed hunks; context lines show intent. Map hunks back to logical change scope, not just file noise.`,
};
