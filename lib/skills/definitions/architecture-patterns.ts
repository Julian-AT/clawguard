import type { SkillDefinition } from "@/lib/skills/types";

export const architecturePatterns: SkillDefinition = {
  id: "architecture-patterns",
  name: "Architecture patterns and anti-patterns",
  domain: "architecture",
  applicableTo: ["architecture", "*"],
  priority: 2,
  content: `Good: clear module boundaries, dependency inversion, stable interfaces, single responsibility, avoiding circular module graphs. Bad: god classes, shotgun surgery, feature envy, leaky abstractions, tight coupling across layers, circular imports. Flag blast radius when a small change forces widespread edits.`,
};
