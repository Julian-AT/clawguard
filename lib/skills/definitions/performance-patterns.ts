import type { SkillDefinition } from "@/lib/skills/types";

export const performancePatterns: SkillDefinition = {
  id: "performance-patterns",
  name: "Performance patterns",
  domain: "performance",
  applicableTo: ["performance", "*"],
  priority: 2,
  content: `Watch for N+1 queries, missing pagination, unbounded loops over user data, sync blocking in async handlers, large deps imported eagerly, missing memoization on hot paths, memory leaks from uncleaned listeners/intervals. Suggest batching, indexes, streaming, lazy imports, pagination.`,
};
