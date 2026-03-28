import { z } from "zod";

export const LearningActionSchema = z.enum(["prefer", "suppress", "escalate"]);
export type LearningAction = z.infer<typeof LearningActionSchema>;

export const LearningSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  context: z.string(),
  action: LearningActionSchema,
  sourcePr: z.number().optional(),
  confidence: z.number().min(0).max(1),
  upvotes: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Learning = z.infer<typeof LearningSchema>;

export const LearningsFileSchema = z.object({
  items: z.array(LearningSchema).default([]),
});
