export {
  loadRepoConfig,
  type LoadRepoConfigResult,
} from "./reader";
export { DEFAULT_CLAWGUARD_CONFIG } from "./defaults";
export {
  ClawGuardConfigSchema,
  ClawGuardConfigFileSchema,
  PoliciesFileSchema,
  PolicyRuleSchema,
  SeverityThresholdSchema,
  type ClawGuardConfig,
  type PolicyRule,
} from "./schemas";
