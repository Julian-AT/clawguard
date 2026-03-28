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
  bot: {
    verbosity: "normal",
    autoSubscribe: true,
    language: "en",
  },
  scanning: {
    timeout: 10 * 60 * 1000,
    maxRetries: 1,
    enableDependencyAudit: true,
    enableSecretScan: true,
    maxSteps: 30,
    depth: "standard",
  },
  notifications: {
    commentStyle: "comment",
    minSeverityToComment: "INFO",
    suppressCleanReports: false,
    mentionAuthors: false,
  },
  trigger: {
    mode: "auto",
    onPushToExisting: true,
    ignoreDraftPRs: true,
    ignoreLabels: [],
    cooldownSeconds: 60,
  },
  analysis: {
    generatePRSummary: true,
    generateSequenceDiagrams: true,
    contextDepth: "standard",
  },
  learnings: {
    enabled: true,
    allowOrgInheritance: true,
    autoPromoteThreshold: 3,
  },
  tracking: {
    enabled: true,
    bugLabels: ["bug", "security-bug", "vulnerability"],
    correlationConfidenceThreshold: 0.7,
  },
  adapters: {},
};
