import type { SkillDefinition } from "@/lib/skills/types";

export const reporting: SkillDefinition = {
  id: "reporting",
  name: "Security Report Structure",
  domain: "reporting",
  applicableTo: ["*"],
  priority: 10,
  content: `Every confirmed finding MUST include: severity (CRITICAL/HIGH/MEDIUM/LOW); concise type/title; file path and line number (or range); CWE ID; OWASP Top 10 2021 category; description of what is wrong; attackScenario explaining realistic exploitation; confidence (HIGH/MEDIUM/LOW); dataFlow as a Mermaid diagram; fix with before/after code snippets.

Mermaid rules: Use \`graph LR\` or \`graph TB\`; keep node labels short (no HTML, no special chars that break parsing); use IDs like \`A[User]\` → \`B[API]\`; prefer dark-theme-friendly neutral wording. If flow is unknown, state assumptions in prose instead of inventing nodes.

Compliance mapping (when in scope): Add a subsection per framework that applies—PCI-DSS (cardholder data), SOC 2 (CC/availability), HIPAA (PHI handling), NIST SSDF/800-53 style controls, OWASP ASVS level references. Map each finding to the most relevant control IDs without over-claiming coverage.

Deduplicate: Same root cause across files may be one finding with multiple locations listed. Sort final report by severity then by component.

Tone: Precise, reproducible, no FUD. If unverified, label as potential issue and lower confidence.`,
};
