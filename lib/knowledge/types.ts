import { z } from "zod";

export const KnowledgeCategorySchema = z.enum([
  "pattern",
  "anti-pattern",
  "adr",
]);
export type KnowledgeCategory = z.infer<typeof KnowledgeCategorySchema>;

export const KnowledgeEntrySchema = z.object({
  id: z.string(),
  category: KnowledgeCategorySchema,
  title: z.string(),
  body: z.string(),
  sourceRepos: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  createdAt: z.string(),
});
export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;
