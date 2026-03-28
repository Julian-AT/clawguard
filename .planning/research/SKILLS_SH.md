# Skills.sh and security skills

## What Skills.sh is

Skills.sh aggregates **portable skill/instruction packs** (often Markdown or structured prompts) for agents. Content varies by author; there is no single standard library for “OWASP” — discovery is manual.

## How ClawGuard maps this

We do not vendor Skills.sh content directly (licensing and drift). Instead, [`lib/skills/definitions/`](../../lib/skills/definitions/) holds **first-party** skill modules:

- `owasp-web-security.ts` — OWASP Top 10 2021 framing
- `secret-scanning.ts`, `api-security.ts`, `pentest-methodology.ts`, `reporting.ts`, etc.

Agents declare `requiredSkills` and `injectSkills()` merges them with a token budget ([`lib/skills/injector.ts`](../../lib/skills/injector.ts)).

## If importing external skills later

1. Normalize any external Markdown into our `SkillDefinition` shape (`id`, `domain`, `priority`, `content`).
2. Store adapted copies under `lib/skills/definitions/` with attribution in file header comments.
3. Run a short duplication pass against existing OWASP skill to avoid contradiction.

## References

- Skills ecosystem moves quickly; treat any third-party skill as **untrusted prompt** until reviewed.
