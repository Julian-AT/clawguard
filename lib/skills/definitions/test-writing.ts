import type { SkillDefinition } from "@/lib/skills/types";

export const testWriting: SkillDefinition = {
  id: "test-writing",
  name: "Meaningful tests",
  domain: "testing",
  applicableTo: ["test-coverage", "*"],
  priority: 2,
  content: `Tests should follow arrange–act–assert, cover edge cases and error paths, use descriptive names (it_should_...). Prefer testing public behavior over internals. Mock external I/O at boundaries. Suggest minimal repro cases for bugs.`,
};
