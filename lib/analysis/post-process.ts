import micromatch from "micromatch";
import type { ClawGuardConfig } from "@/lib/config/schemas";
import type { Finding, ReconResult, ThreatModel } from "./types";
import { calculateScore, getGrade } from "./scoring";
import { FindingSchema } from "./types";

function ensureFindingIds(findings: Finding[]): Finding[] {
  return findings.map((f, i) => ({
    ...f,
    id: f.id ?? `CG-${i + 1}`,
  }));
}

/**
 * Remove findings whose path matches any ignorePaths glob.
 */
export function filterIgnoredPaths(
  findings: Finding[],
  ignorePaths: string[]
): Finding[] {
  if (ignorePaths.length === 0) return findings;
  return findings.filter((f) => {
    const hit = ignorePaths.some((pattern) =>
      micromatch.isMatch(f.file, pattern, { dot: true })
    );
    return !hit;
  });
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();
  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.type}:${f.cweId}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, f);
      continue;
    }
    const rank = (s: Finding["severity"]) =>
      ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].indexOf(s);
    if (rank(f.severity) < rank(existing.severity)) {
      seen.set(key, f);
    }
  }
  return [...seen.values()];
}

export function normalizeThreatModel(tm: ThreatModel | undefined): ThreatModel {
  if (!tm) {
    return {
      attackSurfaces: [],
      attackPaths: [],
    };
  }
  return {
    attackSurfaces: tm.attackSurfaces ?? [],
    attackPaths: tm.attackPaths ?? [],
    overallRisk: tm.overallRisk,
    mergeRecommendation: tm.mergeRecommendation,
    compoundRiskSummary: tm.compoundRiskSummary,
  };
}

export interface PostProcessInput {
  findings: Finding[];
  threatModel: ThreatModel;
  summary: string;
  recon: ReconResult;
  config: ClawGuardConfig;
}

export interface PostProcessResult {
  findings: Finding[];
  threatModel: ThreatModel;
  summary: string;
  score: number;
  grade: string;
}

/**
 * Filter, dedupe, validate findings; compute score and grade.
 */
export function postProcessAudit(input: PostProcessInput): PostProcessResult {
  let findings = filterIgnoredPaths(input.findings, input.config.ignorePaths);
  findings = dedupeFindings(findings);
  findings = ensureFindingIds(findings);

  findings = findings.map((f) => {
    const parsed = FindingSchema.safeParse(f);
    return parsed.success ? parsed.data : f;
  });

  const threatModel = normalizeThreatModel(input.threatModel);
  const score = calculateScore(findings);
  const grade = getGrade(score);

  return {
    findings,
    threatModel,
    summary: input.summary,
    score,
    grade,
  };
}
