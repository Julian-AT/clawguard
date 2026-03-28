import micromatch from "micromatch";
import type { ClawGuardConfig } from "@/lib/config/schemas";
import { SEVERITY_ORDER } from "@/lib/constants";
import { calculateScore, getGrade } from "./scoring";
import type { Finding, ReconResult, ThreatModel } from "./types";
import { FindingSchema } from "./types";

function ensureFindingIds(findings: Finding[]): Finding[] {
  return findings.map((f, i) => ({
    ...f,
    id: f.id ?? `CG-${i + 1}`,
  }));
}

export function filterIgnoredPaths(findings: Finding[], ignorePaths: string[]): Finding[] {
  if (ignorePaths.length === 0) return findings;
  return findings.filter((f) => {
    const hit = ignorePaths.some((pattern) => micromatch.isMatch(f.file, pattern, { dot: true }));
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
    const rank = (s: Finding["severity"]) => SEVERITY_ORDER[s];
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
      strideCategorization: [],
      trustBoundaries: [],
      riskMatrix: [],
    };
  }
  return {
    attackSurfaces: tm.attackSurfaces ?? [],
    attackPaths: tm.attackPaths ?? [],
    overallRisk: tm.overallRisk,
    mergeRecommendation: tm.mergeRecommendation,
    compoundRiskSummary: tm.compoundRiskSummary,
    strideCategorization: tm.strideCategorization ?? [],
    trustBoundaries: tm.trustBoundaries ?? [],
    riskMatrix: tm.riskMatrix ?? [],
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

export function postProcessAudit(input: PostProcessInput): PostProcessResult {
  let findings = filterIgnoredPaths(input.findings, input.config.ignorePaths);
  const allowedPaths = new Set(input.recon.changedFiles.map((c) => c.path));
  findings = findings.filter((f) => allowedPaths.has(f.file));
  findings = dedupeFindings(findings);
  findings = ensureFindingIds(findings);

  const strict: Finding[] = [];
  for (const f of findings) {
    const parsed = FindingSchema.safeParse(f);
    if (parsed.success) {
      strict.push(parsed.data);
    }
  }
  findings = strict;

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
