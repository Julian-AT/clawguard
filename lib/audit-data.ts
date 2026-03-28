import type { AuditResult } from "@/lib/analysis/types";

export interface AuditData {
  /** Present when status is complete or error (after failed run with partial state). */
  result?: AuditResult;
  timestamp: string;
  pr: { owner: string; repo: string; number: number; title: string };
  status: "processing" | "complete" | "error" | "partial_error";
  errorMessage?: string;
  /** When status is partial_error: scan degraded but threat/post-process ran */
  partialErrorMessage?: string;
  /** Last pipeline stage label for processing UI */
  pipelineStage?: string;
  /** Rough ETA ms (rolling average) for processing view */
  etaMsEstimate?: number;
}
