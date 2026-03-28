import type { SkillDefinition } from "@/lib/skills/types";

export const cvssScoring: SkillDefinition = {
  id: "cvss-scoring",
  name: "CVSS v3.1 scoring",
  domain: "cvss",
  applicableTo: ["security-scan", "dependency-audit", "*"],
  priority: 3,
  content: `CVSS v3.1 base score combines Attack Vector (N/A/L/P), Attack Complexity (L/H), Privileges (N/L/H), User Interaction (N/R), Scope (U/C), and Confidentiality/Integrity/Availability impact (N/L/H). Higher when exploitable over network without auth. Use published NVD CVSS when available; otherwise approximate and state assumptions.`,
};
