import { parse as parseYaml } from "yaml";
import type { Octokit } from "@octokit/rest";
import { ConfigError } from "@/lib/errors";
import { DEFAULT_CLAWGUARD_CONFIG } from "./defaults";
import {
  ClawGuardConfigFileSchema,
  ClawGuardConfigSchema,
  PoliciesFileSchema,
  type ClawGuardConfig,
  type PolicyRule,
} from "./schemas";

async function getRepoFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      return null;
    }
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

function mergeConfig(
  parsed: ReturnType<typeof ClawGuardConfigFileSchema.safeParse>["data"]
): ClawGuardConfig {
  const base = structuredClone(DEFAULT_CLAWGUARD_CONFIG);
  if (!parsed) return ClawGuardConfigSchema.parse(base);

  const model = {
    ...base.model,
    ...parsed.model,
  };

  const merged = {
    autoFix: {
      ...base.autoFix,
      ...parsed.autoFix,
    },
    thresholds: {
      ...base.thresholds,
      ...parsed.thresholds,
    },
    ignorePaths:
      parsed.ignorePaths && parsed.ignorePaths.length > 0
        ? parsed.ignorePaths
        : base.ignorePaths,
    report: {
      ...base.report,
      ...parsed.report,
    },
    model,
    bot: {
      ...base.bot,
      ...parsed.bot,
    },
    scanning: {
      ...base.scanning,
      ...parsed.scanning,
      maxSteps:
        parsed.scanning?.maxSteps ?? model.maxSteps ?? base.scanning.maxSteps,
    },
    notifications: {
      ...base.notifications,
      ...parsed.notifications,
    },
    trigger: {
      ...base.trigger,
      ...parsed.trigger,
    },
    analysis: {
      ...base.analysis,
      ...parsed.analysis,
    },
    learnings: {
      ...base.learnings,
      ...parsed.learnings,
    },
    tracking: {
      ...base.tracking,
      ...parsed.tracking,
    },
    adapters: {
      ...base.adapters,
      ...parsed.adapters,
    },
  };

  return ClawGuardConfigSchema.parse(merged);
}

export interface LoadRepoConfigResult {
  config: ClawGuardConfig;
  policies: PolicyRule[];
  configSource: "repo" | "defaults";
  policiesSource: "repo" | "defaults";
}

/**
 * Load `.clawguard/config.yml` and `.clawguard/policies.yml` from the repo at `ref` (e.g. PR head).
 */
export async function loadRepoConfig(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string
): Promise<LoadRepoConfigResult> {
  let configSource: "repo" | "defaults" = "defaults";
  let policiesSource: "repo" | "defaults" = "defaults";

  const configYaml = await getRepoFileContent(
    octokit,
    owner,
    repo,
    ".clawguard/config.yml",
    ref
  );
  const policiesYaml = await getRepoFileContent(
    octokit,
    owner,
    repo,
    ".clawguard/policies.yml",
    ref
  );

  let config: ClawGuardConfig = structuredClone(DEFAULT_CLAWGUARD_CONFIG);

  if (configYaml) {
    try {
      const raw = parseYaml(configYaml);
      const parsed = ClawGuardConfigFileSchema.safeParse(raw);
      if (!parsed.success) {
        throw new ConfigError("Invalid .clawguard/config.yml", {
          context: { issues: parsed.error.flatten() },
        });
      }
      config = mergeConfig(parsed.data);
      configSource = "repo";
    } catch (e) {
      if (e instanceof ConfigError) throw e;
      throw new ConfigError("Failed to parse .clawguard/config.yml", {
        cause: e,
      });
    }
  }

  let policies: PolicyRule[] = [];
  if (policiesYaml) {
    try {
      const raw = parseYaml(policiesYaml);
      const parsed = PoliciesFileSchema.safeParse(raw);
      if (!parsed.success) {
        throw new ConfigError("Invalid .clawguard/policies.yml", {
          context: { issues: parsed.error.flatten() },
        });
      }
      policies = parsed.data.policies;
      policiesSource = "repo";
    } catch (e) {
      if (e instanceof ConfigError) throw e;
      throw new ConfigError("Failed to parse .clawguard/policies.yml", {
        cause: e,
      });
    }
  }

  return { config, policies, configSource, policiesSource };
}
