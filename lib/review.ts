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
 * Runs the four-stage pipeline: recon → security scan → threat synthesis → post-process.
 */
export async function reviewPullRequest(
  input: PipelineInput,
  onProgress?: ProgressCallback
): Promise<AuditResult> {
  return runSecurityPipeline(input, onProgress);
}
