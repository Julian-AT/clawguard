import {
  runSecurityPipeline,
  type ProgressCallback,
  type PipelineInput,
} from "./analysis/pipeline";
import type { AuditResult } from "./analysis/types";

export type { PipelineInput as ReviewInput };
export type { ProgressCallback };

/**
 * Review a pull request for security vulnerabilities.
 *
 * Thin wrapper around the 3-phase security pipeline.
 * Returns a structured AuditResult with findings, score, and grade.
 */
export async function reviewPullRequest(
  input: PipelineInput,
  onProgress?: ProgressCallback
): Promise<AuditResult> {
  return runSecurityPipeline(input, onProgress);
}
