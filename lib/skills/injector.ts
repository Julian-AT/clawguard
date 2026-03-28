import { loadSkillsForAgent } from "@/lib/skills/loader";

const MAX_SKILL_TOKENS_ESTIMATE = 12_000;
const AVG_CHARS_PER_TOKEN = 4;

export function injectSkills(
  baseInstructions: string,
  agentName: string,
  requestedSkillIds?: string[],
): string {
  let skills = loadSkillsForAgent(agentName);

  if (requestedSkillIds?.length) {
    skills = skills.filter((s) => requestedSkillIds.includes(s.id));
  }

  if (skills.length === 0) return baseInstructions;

  const maxChars = MAX_SKILL_TOKENS_ESTIMATE * AVG_CHARS_PER_TOKEN;
  const blocks: string[] = [];
  let totalChars = 0;

  for (const skill of skills) {
    if (totalChars + skill.content.length > maxChars) break;
    blocks.push(`## Skill: ${skill.name}\n\n${skill.content}`);
    totalChars += skill.content.length;
  }

  return [baseInstructions, "", "---", "# Injected Skills", "", ...blocks].join("\n");
}
