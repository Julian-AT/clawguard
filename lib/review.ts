import {
  type PipelineInput,
  type ProgressCallback,
  runSecurityPipeline,
} from "./analysis/pipeline";
import type { AuditResult } from "./analysis/types";

export type { PipelineInput as ReviewInput, ProgressCallback };

export async function reviewPullRequest(
  input: PipelineInput,
  onProgress?: ProgressCallback,
): Promise<AuditResult> {
  return runSecurityPipeline(input, onProgress);
}
