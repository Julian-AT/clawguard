import {
  runSecurityPipeline,
  type ProgressCallback,
  type PipelineInput,
} from "./analysis/pipeline";
import type { AuditResult } from "./analysis/types";

export type { PipelineInput as ReviewInput };
export type { ProgressCallback };

export async function reviewPullRequest(
  input: PipelineInput,
  onProgress?: ProgressCallback
): Promise<AuditResult> {
  return runSecurityPipeline(input, onProgress);
}
