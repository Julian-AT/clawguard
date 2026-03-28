import { apiSecurity } from "@/lib/skills/definitions/api-security";
import { architecturePatterns } from "@/lib/skills/definitions/architecture-patterns";
import { codeQuality } from "@/lib/skills/definitions/code-quality";
import { codeSmellsCatalog } from "@/lib/skills/definitions/code-smells-catalog";
import { cvssScoring } from "@/lib/skills/definitions/cvss-scoring";
import { dependencyAudit } from "@/lib/skills/definitions/dependency-audit";
import { gitDiffReading } from "@/lib/skills/definitions/git-diff-reading";
import { infrastructureReview } from "@/lib/skills/definitions/infrastructure-review";
import { orchestration } from "@/lib/skills/definitions/orchestration";
import { owaspWebSecurity } from "@/lib/skills/definitions/owasp-web-security";
import { performancePatterns } from "@/lib/skills/definitions/performance-patterns";
import { pentestMethodology } from "@/lib/skills/definitions/pentest-methodology";
import { prReviewTone } from "@/lib/skills/definitions/pr-review-tone";
import { reporting } from "@/lib/skills/definitions/reporting";
import { secretScanning } from "@/lib/skills/definitions/secret-scanning";
import { secureCodePatterns } from "@/lib/skills/definitions/secure-code-patterns";
import { testWriting } from "@/lib/skills/definitions/test-writing";
import type { SkillDefinition } from "@/lib/skills/types";

const ALL_SKILLS: SkillDefinition[] = [
  owaspWebSecurity,
  codeQuality,
  codeSmellsCatalog,
  pentestMethodology,
  dependencyAudit,
  secretScanning,
  apiSecurity,
  infrastructureReview,
  reporting,
  orchestration,
  prReviewTone,
  gitDiffReading,
  cvssScoring,
  architecturePatterns,
  testWriting,
  secureCodePatterns,
  performancePatterns,
];

export function loadAllSkills(): SkillDefinition[] {
  return ALL_SKILLS;
}

export function loadSkillById(id: string): SkillDefinition | undefined {
  return ALL_SKILLS.find((s) => s.id === id);
}

export function loadSkillsForAgent(agentName: string): SkillDefinition[] {
  return ALL_SKILLS.filter(
    (s) => s.applicableTo.includes(agentName) || s.applicableTo.includes("*"),
  ).sort((a, b) => a.priority - b.priority);
}
