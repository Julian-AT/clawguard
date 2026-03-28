import type { ClawGuardConfig } from "./schemas";

export const DEFAULT_CLAWGUARD_CONFIG: ClawGuardConfig = {
  autoFix: {
    enabled: true,
    commitDirectly: true,
    maxFixesPerRun: 10,
    requireValidation: true,
  },
  thresholds: {
    blockMerge: "CRITICAL",
    requestChanges: "HIGH",
    commentOnly: "MEDIUM",
  },
  ignorePaths: [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/fixtures/**",
    "**/mocks/**",
    "**/docs/**",
  ],
  report: {
    generateInteractiveReport: true,
    frameworks: ["OWASP", "PCI-DSS", "SOC2"],
  },
  model: {
    provider: "anthropic",
    model: "claude-sonnet-4.6",
    maxSteps: 30,
  },
};
