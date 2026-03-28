import { z } from "zod";

export const SeverityThresholdSchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
]);

export const ClawGuardConfigFileSchema = z
  .object({
    autoFix: z
      .object({
        enabled: z.boolean().optional(),
        commitDirectly: z.boolean().optional(),
        maxFixesPerRun: z.number().int().positive().optional(),
        requireValidation: z.boolean().optional(),
      })
      .optional(),
    thresholds: z
      .object({
        blockMerge: SeverityThresholdSchema.optional(),
        requestChanges: SeverityThresholdSchema.optional(),
        commentOnly: SeverityThresholdSchema.optional(),
      })
      .optional(),
    ignorePaths: z.array(z.string()).optional(),
    report: z
      .object({
        generateInteractiveReport: z.boolean().optional(),
        frameworks: z.array(z.string()).optional(),
      })
      .optional(),
    model: z
      .object({
        provider: z.string().optional(),
        model: z.string().optional(),
        maxSteps: z.number().int().positive().optional(),
      })
      .optional(),
  })
  .passthrough();

export type ClawGuardConfigFile = z.infer<typeof ClawGuardConfigFileSchema>;

export const PolicyRuleSchema = z.object({
  name: z.string(),
  rule: z.string(),
  severity: SeverityThresholdSchema,
});

export const PoliciesFileSchema = z.object({
  policies: z.array(PolicyRuleSchema).default([]),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

/** Merged runtime config (defaults + repo). */
export const ClawGuardConfigSchema = z.object({
  autoFix: z.object({
    enabled: z.boolean(),
    commitDirectly: z.boolean(),
    maxFixesPerRun: z.number().int().positive(),
    requireValidation: z.boolean(),
  }),
  thresholds: z.object({
    blockMerge: SeverityThresholdSchema,
    requestChanges: SeverityThresholdSchema,
    commentOnly: SeverityThresholdSchema,
  }),
  ignorePaths: z.array(z.string()),
  report: z.object({
    generateInteractiveReport: z.boolean(),
    frameworks: z.array(z.string()),
  }),
  model: z.object({
    provider: z.string(),
    model: z.string(),
    maxSteps: z.number().int().positive(),
  }),
});

export type ClawGuardConfig = z.infer<typeof ClawGuardConfigSchema>;
