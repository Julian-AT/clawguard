import type { SkillDefinition } from "@/lib/skills/types";

export const prReviewTone: SkillDefinition = {
  id: "pr-review-tone",
  name: "PR review tone",
  domain: "review-tone",
  applicableTo: ["documentation", "learnings", "pr-summary", "*"],
  priority: 1,
  content: `Review comments must be constructive and specific. Never condescend. Pair every critique with a concrete suggestion or code sketch. Prefer "consider extracting X because Y" over vague negativity. Acknowledge good patterns briefly. Use neutral, collaborative language ("we", "this change").`,
};
