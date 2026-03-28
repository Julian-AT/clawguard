import { z } from "zod";

export const SeverityThresholdSchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
]);

export const BotConfigSchema = z.object({
  verbosity: z.enum(["minimal", "normal", "verbose"]),
  autoSubscribe: z.boolean(),
  language: z.string(),
});

export const ScanningConfigSchema = z.object({
  timeout: z.number().int().positive(),
  maxRetries: z.number().int().min(0).max(5),
  enableDependencyAudit: z.boolean(),
  enableSecretScan: z.boolean(),
  maxSteps: z.number().int().positive(),
  depth: z.enum(["quick", "standard", "deep"]),
});

export const NotificationsConfigSchema = z.object({
  commentStyle: z.enum(["comment", "review"]),
  minSeverityToComment: SeverityThresholdSchema,
  suppressCleanReports: z.boolean(),
  mentionAuthors: z.boolean(),
});

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
    bot: z
      .object({
        verbosity: BotConfigSchema.shape.verbosity.optional(),
        autoSubscribe: z.boolean().optional(),
        language: z.string().optional(),
      })
      .optional(),
    scanning: z
      .object({
        timeout: z.number().int().positive().optional(),
        maxRetries: z.number().int().min(0).max(5).optional(),
        enableDependencyAudit: z.boolean().optional(),
        enableSecretScan: z.boolean().optional(),
        maxSteps: z.number().int().positive().optional(),
        depth: z.enum(["quick", "standard", "deep"]).optional(),
      })
      .optional(),
    notifications: z
      .object({
        commentStyle: z.enum(["comment", "review"]).optional(),
        minSeverityToComment: SeverityThresholdSchema.optional(),
        suppressCleanReports: z.boolean().optional(),
        mentionAuthors: z.boolean().optional(),
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
  bot: BotConfigSchema,
  scanning: ScanningConfigSchema,
  notifications: NotificationsConfigSchema,
});

export type ClawGuardConfig = z.infer<typeof ClawGuardConfigSchema>;
