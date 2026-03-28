import type { SkillDefinition } from "@/lib/skills/types";

export const codeSmellsCatalog: SkillDefinition = {
  id: "code-smells",
  name: "Code smells catalogue",
  domain: "code-quality",
  applicableTo: ["code-quality", "*"],
  priority: 2,
  content: `Smells: long method, large class, feature envy, data clumps, primitive obsession, long parameter list, switch statements duplicating type checks, parallel inheritance hierarchies, speculative generality, dead code, duplicated logic. Pair each with AST evidence: function length, nesting depth, cyclomatic complexity.`,
};
