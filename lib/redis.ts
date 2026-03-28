import { Redis } from "@upstash/redis";
import type { AuditResult } from "@/lib/analysis/types";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

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

export async function storeAuditResult(params: { key: string; data: AuditData }): Promise<void> {
  await redis.set(params.key, JSON.stringify(params.data));
}

export async function getAuditResult(key: string): Promise<AuditData | null> {
  const raw = await redis.get<string>(key);
  return raw ? JSON.parse(raw) : null;
}
