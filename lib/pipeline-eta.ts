import { redis } from "@/lib/redis";

const GLOBAL_KEY = "pipeline:eta:avg_ms";
const SAMPLES_MAX = 20;

/**
 * Rolling average pipeline duration (ms) for rough ETA hints in UI.
 */
export async function recordPipelineDurationMs(durationMs: number): Promise<void> {
  try {
    const raw = await redis.get<number>(GLOBAL_KEY);
    const prev = raw != null ? Number(raw) : durationMs;
    const next = Math.round((prev * (SAMPLES_MAX - 1) + durationMs) / SAMPLES_MAX);
    await redis.set(GLOBAL_KEY, String(Math.max(60_000, next)));
  } catch {
    // ignore
  }
}

export async function getEstimatedPipelineMs(): Promise<number | null> {
  try {
    const raw = await redis.get<number>(GLOBAL_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
