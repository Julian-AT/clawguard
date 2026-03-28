import type { Octokit } from "@octokit/rest";
import type { Finding } from "@/lib/analysis/types";

export interface FixResult {
  finding: Finding;
  status: "fixed" | "skipped";
  commitSha?: string;
  error?: string;
  tier: "fast" | "agent";
}

export interface FixContext {
  owner: string;
  repo: string;
  prBranch: string;
  prNumber: number;
  octokit: Octokit;
}

export interface ValidationResult {
  passed: boolean;
  errors: string;
  tools: string[];
}

export interface ApplyResult {
  valid: boolean;
  content: string;
  errors: string;
}
