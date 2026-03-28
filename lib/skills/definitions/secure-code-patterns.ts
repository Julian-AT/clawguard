import type { SkillDefinition } from "@/lib/skills/types";

export const secureCodePatterns: SkillDefinition = {
  id: "secure-code-patterns",
  name: "Secure coding patterns",
  domain: "security",
  applicableTo: ["security-scan", "api-security", "*"],
  priority: 2,
  content: `Prefer parameterized queries/ORM bindings, contextual output encoding for HTML/JS/URL, CSRF tokens on state-changing requests, rate limits on auth endpoints, validating and normalizing input at trust boundaries, least-privilege auth checks, secure defaults for crypto (AEAD, modern algorithms).`,
};
