import type { SkillDefinition } from "@/lib/skills/types";

export const codeQuality: SkillDefinition = {
  id: "code-quality",
  name: "Code Quality for Security",
  domain: "code-quality",
  applicableTo: ["security-scan", "*"],
  priority: 2,
  content: `Treat code-quality issues as security signals when they hide failures or widen attack surface.

Error handling: Flag empty catch blocks, catches that only log and continue on security-sensitive paths (auth, payment, crypto), and swallowed promise rejections. Require explicit handling or rethrow for authentication, authorization, and deserialization. Silent failure can mask brute-force, injection, or integrity violations.

Input validation: Validate and normalize at trust boundaries (HTTP handlers, message queues, webhooks)—not only deep in services. Reject unexpected types and oversize payloads early. Prefer schema validation (Zod, joi, yup) over ad-hoc checks. Missing validation often precedes injection and business-logic abuse.

Type safety: Flag liberal use of \`any\`, unchecked JSON casts, and non-null assertions on external data. Prefer narrow types and runtime validation together. Weak typing correlates with deserialization bugs and confused-deputy logic.

Resource management: Ensure DB connections, streams, and file handles are closed or scoped (try/finally, using patterns). Leaks can enable DoS; abandoned temp files may leak secrets.

Logging: Never log passwords, tokens, full payment data, or session identifiers at info level. Prefer structured logs without PII; redact known secret patterns. Verbose logging of requests can leak credentials in query strings or headers.

When reporting, tie each issue to exploitability: e.g. "empty catch around JWT verify" → auth may fail open. Prioritize findings on code paths reachable without authentication or with low-privilege roles.`,
};
