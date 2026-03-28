import { z } from "zod";

export const SeveritySchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
]);
export type Severity = z.infer<typeof SeveritySchema>;

export const ConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const RemediationEffortSchema = z.enum([
  "trivial",
  "small",
  "medium",
  "large",
]);
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

export const FindingSchema = z.object({
  id: z.string().optional(),
  severity: SeveritySchema,
  type: z.string(),
  title: z.string().optional(),
  file: z.string(),
  line: z.number(),
  endLine: z.number().optional(),
  cweId: z.string(),
  owaspCategory: z.string(),
  description: z.string(),
  attackScenario: z.string(),
  confidence: ConfidenceSchema,
  dataFlow: DataFlowSchema.optional(),
  fix: CodeFixSchema.optional(),
  complianceMapping: ComplianceMappingSchema.optional(),
  remediationEffort: RemediationEffortSchema.optional(),
  policyViolation: z.string().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const PhaseResultSchema = z.object({
  phase: z
    .enum(["code-quality", "vulnerability-scan", "threat-model", "security-scan"])
    .optional(),
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
      })
    )
    .default([]),
  overallRisk: z.string().optional(),
  mergeRecommendation: z.string().optional(),
  compoundRiskSummary: z.string().optional(),
});
export type ThreatModel = z.infer<typeof ThreatModelSchema>;

export const ReconResultSchema = z.object({
  changedFiles: z.array(
    z.object({
      path: z.string(),
    })
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
});

export type ReconResult = z.infer<typeof ReconResultSchema>;

export const AuditMetadataSchema = z.object({
  timestamp: z.string(),
  filesChanged: z.number(),
  linesChanged: z.number(),
  modelUsed: z.string(),
  pipelineDurationMs: z.number(),
  configFingerprint: z.string().optional(),
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
});
export type AuditResult = z.infer<typeof AuditResultSchema>;
