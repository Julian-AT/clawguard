import { z } from "zod";

export const SeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const ConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const RemediationEffortSchema = z.enum(["trivial", "small", "medium", "large"]);
export type RemediationEffort = z.infer<typeof RemediationEffortSchema>;

export const DataFlowNodeSchema = z.object({
  label: z.string(),
  type: z.enum(["source", "transform", "sink"]),
});

export const DataFlowSchema = z.object({
  nodes: z.array(DataFlowNodeSchema),
  description: z.string().optional(),
  /** Raw Mermaid diagram source (preferred for rendering). */
  mermaidDiagram: z.string().optional(),
});

export const CodeFixSchema = z.object({
  before: z.string(),
  after: z.string(),
  file: z.string().optional(),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
  explanation: z.string().optional(),
});

export const ComplianceMappingSchema = z.object({
  pciDss: z.array(z.string()).default([]),
  soc2: z.array(z.string()).default([]),
  hipaa: z.array(z.string()).default([]),
  nist: z.array(z.string()).default([]),
  owaspAsvs: z.array(z.string()).default([]),
});

export const StrideCategorySchema = z.enum(["S", "T", "R", "I", "D", "E"]);
export type StrideCategory = z.infer<typeof StrideCategorySchema>;

export const FindingCategorySchema = z.enum([
  "security",
  "quality",
  "architecture",
  "testing",
  "documentation",
  "performance",
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const FindingSchema = z.object({
  id: z.string().optional(),
  /** Review domain; defaults to security for legacy audits */
  category: FindingCategorySchema.default("security"),
  severity: SeveritySchema,
  type: z.string(),
  title: z.string().optional(),
  file: z.string(),
  line: z.number(),
  endLine: z.number().optional(),
  /** Security agents should set these; optional for quality/docs/etc. */
  cweId: z.string().optional(),
  owaspCategory: z.string().optional(),
  description: z.string(),
  attackScenario: z.string().optional(),
  confidence: ConfidenceSchema,
  dataFlow: DataFlowSchema.optional(),
  fix: CodeFixSchema.optional(),
  complianceMapping: ComplianceMappingSchema.optional(),
  remediationEffort: RemediationEffortSchema.optional(),
  policyViolation: z.string().optional(),
  /** STRIDE: Spoofing, Tampering, Repudiation, Info disclosure, Denial of service, Elevation */
  strideCategory: StrideCategorySchema.optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const ReviewVerdictSchema = z.enum(["approve", "request-changes", "comment"]);
export type ReviewVerdict = z.infer<typeof ReviewVerdictSchema>;

export const ReviewVerdictResultSchema = z.object({
  verdict: ReviewVerdictSchema,
  reasoning: z.string(),
});
export type ReviewVerdictResult = z.infer<typeof ReviewVerdictResultSchema>;

export const TeamPatternSchema = z.object({
  pattern: z.string(),
  evidence: z.string(),
  elevated: z.boolean().optional(),
});
export type TeamPattern = z.infer<typeof TeamPatternSchema>;

export const PhaseResultSchema = z.object({
  phase: z.enum(["code-quality", "vulnerability-scan", "threat-model", "security-scan"]).optional(),
  findings: z.array(FindingSchema),
  summary: z.string(),
});
export type PhaseResult = z.infer<typeof PhaseResultSchema>;

export const AttackSurfaceEntrySchema = z.object({
  name: z.string(),
  type: z.string(),
  exposure: z.string(),
  riskLevel: SeveritySchema,
  description: z.string(),
});
export type AttackSurfaceEntry = z.infer<typeof AttackSurfaceEntrySchema>;

export const ThreatModelSchema = z.object({
  attackSurfaces: z.array(AttackSurfaceEntrySchema).default([]),
  attackPaths: z
    .array(
      z.object({
        name: z.string(),
        mermaidDiagram: z.string(),
        riskAssessment: z.string(),
      }),
    )
    .default([]),
  overallRisk: z.string().optional(),
  mergeRecommendation: z.string().optional(),
  compoundRiskSummary: z.string().optional(),
  strideCategorization: z
    .array(
      z.object({
        label: z.string(),
        stride: StrideCategorySchema,
        description: z.string(),
      }),
    )
    .default([]),
  trustBoundaries: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        mermaidDiagram: z.string().optional(),
      }),
    )
    .default([]),
  riskMatrix: z
    .array(
      z.object({
        likelihood: z.enum(["low", "medium", "high"]),
        impact: z.enum(["low", "medium", "high"]),
        topic: z.string(),
        notes: z.string(),
      }),
    )
    .default([]),
});
export type ThreatModel = z.infer<typeof ThreatModelSchema>;

export const PRSummarySchema = z.object({
  narrative: z.string(),
  sequenceDiagrams: z.array(
    z.object({
      title: z.string(),
      mermaidDiagram: z.string(),
      description: z.string(),
    }),
  ),
  dependencyImpact: z.array(
    z.object({
      file: z.string(),
      impactedBy: z.array(z.string()),
      impactType: z.enum(["direct", "transitive"]),
    }),
  ),
  breakingChanges: z.array(z.string()),
  complexity: z.enum(["trivial", "small", "medium", "large", "very-large"]),
});
export type PRSummary = z.infer<typeof PRSummarySchema>;

export const DependencyGraphSchema = z.object({
  changedModules: z.array(
    z.object({
      file: z.string(),
      imports: z.array(z.string()),
      importedBy: z.array(z.string()),
      exportsUsedElsewhere: z.array(z.string()),
    }),
  ),
  securitySensitiveAPIs: z.array(z.string()),
  envVarsTouched: z.array(z.string()),
});
export type DependencyGraph = z.infer<typeof DependencyGraphSchema>;

export const ReconResultSchema = z.object({
  changedFiles: z.array(
    z.object({
      path: z.string(),
    }),
  ),
  languages: z.array(z.string()),
  packageManager: z.string().optional(),
  frameworkHints: z.array(z.string()),
  staticAnalysisSnippet: z.string().optional(),
  diff: z.string(),
  /** Truncated path -> excerpt for agent context */
  fileExcerpts: z.record(z.string(), z.string()).optional(),
  /** Approximate changed hunk lines in diff */
  linesChanged: z.number().optional(),
  /** Truncated npm/pnpm audit --json output */
  dependencyAuditSnippet: z.string().optional(),
  /** Heuristic secret-like strings spotted in diff */
  secretPatternHints: z.array(z.string()).optional(),
  /** Optional Semgrep SARIF excerpt if `.clawguard/semgrep.sarif` exists */
  optionalSarifSnippet: z.string().optional(),
  /** Import/call context when analysis.contextDepth is standard or deep */
  dependencyGraph: DependencyGraphSchema.optional(),
});

export type ReconResult = z.infer<typeof ReconResultSchema>;

export const AuditMetadataSchema = z.object({
  timestamp: z.string(),
  filesChanged: z.number(),
  linesChanged: z.number(),
  modelUsed: z.string(),
  pipelineDurationMs: z.number(),
  configFingerprint: z.string().optional(),
  /** Security scan failed after retry; findings may be empty or reduced */
  scanPartialFailure: z.boolean().optional(),
  scanErrorMessage: z.string().optional(),
  /** Rough ETA used for this run (from rolling average at start) */
  pipelineEtaMsEstimate: z.number().optional(),
});

export type AuditMetadata = z.infer<typeof AuditMetadataSchema>;

export const AuditResultSchema = z.object({
  score: z.number().min(0).max(100),
  grade: z.string(),
  summary: z.string().optional().default(""),
  phases: z.array(PhaseResultSchema).optional(),
  findings: z.array(FindingSchema),
  /** Populated by pipeline; optional for legacy stored audits */
  threatModel: ThreatModelSchema.optional(),
  recon: ReconResultSchema.optional(),
  metadata: AuditMetadataSchema.optional(),
  /** PR change narrative, sequence diagrams, dependency impact (v2) */
  prSummary: PRSummarySchema.optional(),
  /** Overall review outcome from learnings agent */
  verdict: ReviewVerdictResultSchema.optional(),
  /** Recurring team patterns surfaced by learnings agent */
  teamPatterns: z.array(TeamPatternSchema).optional(),
});
export type AuditResult = z.infer<typeof AuditResultSchema>;

const COMPLIANCE_KEYS = ["pciDss", "soc2", "hipaa", "nist", "owaspAsvs"] as const;

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v : String(v)));
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (t === "") return [];
    return [t];
  }
  return [];
}

function normalizeComplianceMappingInput(raw: unknown): unknown {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const m = { ...(raw as Record<string, unknown>) };
  for (const k of COMPLIANCE_KEYS) {
    if (k in m) {
      m[k] = coerceStringArray(m[k]);
    }
  }
  return m;
}

function normalizeDataFlowInput(raw: unknown): unknown {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const d = { ...(raw as Record<string, unknown>) };
  if (!Array.isArray(d.nodes)) {
    d.nodes = [];
  }
  return d;
}

function normalizeConfidence(value: unknown): "HIGH" | "MEDIUM" | "LOW" {
  if (typeof value === "string") {
    const u = value.trim().toUpperCase();
    if (u === "HIGH" || u === "MEDIUM" || u === "LOW") return u;
  }
  return "MEDIUM";
}

/**
 * Coerces a single finding from Redis / older agent output (missing fields,
 * compliance strings vs arrays, partial dataFlow).
 */
export function normalizeFindingInput(raw: unknown): unknown {
  if (raw === null || typeof raw !== "object") return raw;
  const f = { ...(raw as Record<string, unknown>) };

  if (f.file === undefined || f.file === null) {
    f.file = "";
  } else if (typeof f.file !== "string") {
    f.file = String(f.file);
  }

  if (f.line === undefined || f.line === null) {
    f.line = 0;
  } else {
    const n = Number(f.line);
    f.line = Number.isFinite(n) ? n : 0;
  }

  f.confidence = normalizeConfidence(f.confidence);

  if (f.dataFlow !== undefined && f.dataFlow !== null) {
    f.dataFlow = normalizeDataFlowInput(f.dataFlow);
  }

  if (f.complianceMapping !== undefined && f.complianceMapping !== null) {
    f.complianceMapping = normalizeComplianceMappingInput(f.complianceMapping);
  }

  return f;
}

function normalizeFindingsArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeFindingInput(item));
}

/**
 * Coerces Redis / legacy payloads before schema parse:
 * - `phases` may be a plain object (e.g. keyed by stage) instead of an array
 * - `findings` may be absent when only phase-level findings exist
 * - per-finding: optional file/line, confidence aliases, dataFlow.nodes, compliance string→array
 */
export function normalizeAuditResultInput(raw: unknown): unknown {
  if (raw === null || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };
  let phases = o.phases;
  if (phases != null && !Array.isArray(phases) && typeof phases === "object") {
    phases = Object.values(phases as Record<string, unknown>);
  }
  if (Array.isArray(phases)) {
    phases = phases.map((p) => {
      if (p === null || typeof p !== "object") return p;
      const ph = { ...(p as Record<string, unknown>) };
      ph.findings = normalizeFindingsArray(ph.findings);
      return ph;
    });
  }
  o.phases = phases;
  if (o.findings === undefined || o.findings === null) {
    if (Array.isArray(phases)) {
      const merged: unknown[] = [];
      for (const p of phases) {
        if (p && typeof p === "object" && Array.isArray((p as { findings?: unknown[] }).findings)) {
          merged.push(...(p as { findings: unknown[] }).findings);
        }
      }
      o.findings = merged;
    } else {
      o.findings = [];
    }
  } else {
    o.findings = normalizeFindingsArray(o.findings);
  }
  return o;
}

export function parseAuditResult(raw: unknown): AuditResult {
  return AuditResultSchema.parse(normalizeAuditResultInput(raw));
}
