export {
  loadRepoConfig,
  type LoadRepoConfigResult,
} from "./reader";
export { DEFAULT_CLAWGUARD_CONFIG } from "./defaults";
export {
  BotConfigSchema,
  ClawGuardConfigSchema,
  ClawGuardConfigFileSchema,
  NotificationsConfigSchema,
  PoliciesFileSchema,
  PolicyRuleSchema,
  ScanningConfigSchema,
  SeverityThresholdSchema,
  type ClawGuardConfig,
  type PolicyRule,
} from "./schemas";
