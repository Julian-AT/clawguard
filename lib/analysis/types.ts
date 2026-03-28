import { z } from "zod";

export const SeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const ConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const DataFlowNodeSchema = z.object({
  label: z.string(),
  type: z.enum(["source", "transform", "sink"]),
});

export const DataFlowSchema = z.object({
  nodes: z.array(DataFlowNodeSchema),
  description: z.string().optional(),
});

export const CodeFixSchema = z.object({
  before: z.string(),
  after: z.string(),
  file: z.string().optional(),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
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
  cweId: z.string(),
  owaspCategory: z.string(),
  description: z.string(),
  attackScenario: z.string(),
  confidence: ConfidenceSchema,
  dataFlow: DataFlowSchema.optional(),
  fix: CodeFixSchema.optional(),
  complianceMapping: ComplianceMappingSchema.optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const PhaseResultSchema = z.object({
  phase: z.enum(["code-quality", "vulnerability-scan", "threat-model"]).optional(),
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
  attackSurfaces: z.array(AttackSurfaceEntrySchema),
  attackPaths: z.array(z.object({
    name: z.string(),
    mermaidDiagram: z.string(),
    riskAssessment: z.string(),
  })),
});
export type ThreatModel = z.infer<typeof ThreatModelSchema>;

export const AuditResultSchema = z.object({
  score: z.number().min(0).max(100),
  grade: z.string(),
  phases: z.array(PhaseResultSchema),
  findings: z.array(FindingSchema),
  threatModel: ThreatModelSchema.optional(),
  summary: z.string().optional(),
});
export type AuditResult = z.infer<typeof AuditResultSchema>;
