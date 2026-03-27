import { z } from "zod";

export const SeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

export const FindingSchema = z.object({
  severity: SeveritySchema.describe("Severity level of the finding"),
  type: z.string().describe("Vulnerability type, e.g. 'sql-injection', 'hardcoded-secret'"),
  location: z.object({
    file: z.string().describe("File path relative to repo root"),
    line: z.number().describe("Line number where the vulnerability exists"),
  }),
  cweId: z.string().describe("CWE identifier, e.g. 'CWE-89'"),
  owaspCategory: z.string().describe("OWASP Top 10 2021 category, e.g. 'A03:2021-Injection'"),
  description: z.string().describe("Detailed description of the vulnerability"),
  attackScenario: z.string().describe("Realistic attack scenario exploiting this vulnerability"),
  confidence: ConfidenceSchema.describe("Confidence level of this finding"),
  dataFlow: z
    .object({
      source: z.string().describe("Data entry point, e.g. 'req.body.username'"),
      transform: z.string().describe("How data is transformed, e.g. 'string concatenation'"),
      sink: z.string().describe("Where tainted data reaches, e.g. 'db.query()'"),
    })
    .describe("Source -> Transform -> Sink data flow chain"),
  fix: z
    .object({
      before: z.string().describe("Vulnerable code snippet"),
      after: z.string().describe("Fixed code snippet"),
    })
    .describe("Before/after code fix"),
  complianceMapping: z
    .object({
      pciDss: z.string().optional().describe("PCI DSS reference"),
      soc2: z.string().optional().describe("SOC 2 control reference"),
      hipaa: z.string().optional().describe("HIPAA reference"),
      nist: z.string().optional().describe("NIST 800-53 control"),
      owaspAsvs: z.string().optional().describe("OWASP ASVS reference"),
    })
    .describe("Compliance framework mappings"),
});

export const PhaseResultSchema = z.object({
  summary: z.string().describe("Summary of this analysis phase"),
  findings: z.array(FindingSchema).describe("Findings from this phase"),
});

export const AuditResultSchema = z.object({
  phases: z.object({
    quality: PhaseResultSchema,
    vulnerability: PhaseResultSchema,
    threatModel: PhaseResultSchema,
  }),
  allFindings: z.array(FindingSchema),
  score: z.number(),
  grade: z.string(),
  severityCounts: z.record(z.string(), z.number()),
});

export type Severity = z.infer<typeof SeveritySchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type PhaseResult = z.infer<typeof PhaseResultSchema>;
export type AuditResult = z.infer<typeof AuditResultSchema>;
