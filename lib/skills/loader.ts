import type { SkillDefinition } from "@/lib/skills/types";
import { owaspWebSecurity } from "@/lib/skills/definitions/owasp-web-security";
import { codeQuality } from "@/lib/skills/definitions/code-quality";
import { pentestMethodology } from "@/lib/skills/definitions/pentest-methodology";
import { dependencyAudit } from "@/lib/skills/definitions/dependency-audit";
import { secretScanning } from "@/lib/skills/definitions/secret-scanning";
import { apiSecurity } from "@/lib/skills/definitions/api-security";
import { infrastructureReview } from "@/lib/skills/definitions/infrastructure-review";
import { reporting } from "@/lib/skills/definitions/reporting";
import { orchestration } from "@/lib/skills/definitions/orchestration";

const ALL_SKILLS: SkillDefinition[] = [
  owaspWebSecurity,
  codeQuality,
  pentestMethodology,
  dependencyAudit,
  secretScanning,
  apiSecurity,
  infrastructureReview,
  reporting,
  orchestration,
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
