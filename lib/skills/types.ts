export interface SkillDefinition {
  id: string;
  name: string;
  domain: SkillDomain;
  /** Agent names this skill applies to, or "*" for all */
  applicableTo: string[];
  priority: number;
  /** The instruction content injected into agent prompts */
  content: string;
}

export type SkillDomain =
  | "security"
  | "code-quality"
  | "pentest"
  | "dependency"
  | "secrets"
  | "api"
  | "infrastructure"
  | "reporting"
  | "orchestration";
