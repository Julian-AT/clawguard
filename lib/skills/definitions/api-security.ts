import type { SkillDefinition } from "@/lib/skills/types";

export const apiSecurity: SkillDefinition = {
  id: "api-security",
  name: "API & Route Handler Security",
  domain: "api",
  applicableTo: ["api-security"],
  priority: 1,
  content: `Review HTTP APIs (REST, GraphQL, RPC) as a single auth and validation surface.

Authentication/authorization: Every route handler must enforce authn unless explicitly public. Re-verify role/tenant on each handler—do not rely on front-end gating alone. For GraphQL, check per-field resolvers, not only top-level.

Rate limiting: Flag missing or uniform limits on login, password reset, search, and expensive mutations. Prefer per-IP and per-user keys; note DoS risk on unbounded endpoints.

Input validation: Require schema validation at the boundary (Zod/joi/yup/OpenAPI). Reject unknown fields when mass-assignment is a risk. Validate content-types and body size limits.

CORS: Wildcard \`*\` with \`credentials: true\` is invalid and dangerous if misconfigured elsewhere. Reflecting arbitrary Origin with credentials is CRITICAL. List safe origins explicitly.

Errors: Do not return stack traces, SQL errors, or internal paths to clients in production. Map to stable error codes.

Mass assignment: Never spread raw request bodies into ORM \`create/update\` without allow-lists; flag \`...req.body\` patterns.

Injection in APIs: ORM raw SQL, \`$queryRawUnsafe\`, string-built filters in MongoDB, and GraphQL depth/complexity bombs.

JWT: Verify signature with correct algorithm, validate \`exp\`/\`nbf\`, issuer/audience if applicable; reject \`alg: none\` and unexpected algs. Store secrets in env/KMS—not code.

Cookies: Set \`HttpOnly\`, \`Secure\`, sensible \`SameSite\` for session cookies; flag missing flags on sensitive cookies.`,
};
