# Phase 5: Chat, Config & Dashboard - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn ClawGuard into a real SaaS tool with three capabilities: (1) conversational follow-up in PR threads where developers can ask security questions and get AI-generated contextual answers referencing the audit findings, (2) per-repo configuration via `.clawguard/config.yml` and `.clawguard/policies.yml` that customize audit behavior and inject custom security rules, and (3) an authenticated dashboard showing connected repos with audit history.

Requirements: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, SCAN-09, DASH-01, DASH-02, DASH-03, DASH-04

</domain>

<decisions>
## Implementation Decisions

### Chat Follow-Up Behavior
- **D-01:** AI-generated contextual replies for non-command follow-up questions. When `detectIntent()` returns `unknown`, instead of no-op, invoke the AI with audit context + user question to generate a security-focused response.
- **D-02:** Full audit context provided to the AI — complete audit result JSON, PR diff, and conversation history from Redis. Maximum context for high-quality answers.
- **D-03:** Conversation history maintained in Redis per thread. Bot remembers earlier questions in the same PR thread for multi-turn conversations. Key pattern: `chat:{owner}/{repo}/pr/{number}`.
- **D-04:** Post complete messages (not streamed). Simpler, avoids GitHub comment edit rate limits. Post a "thinking..." placeholder, then replace with the full answer.
- **D-05:** Developer can request specific fixes via chat ("fix the SQL injection in users.ts") — this is already handled by `detectIntent()` returning `fix-finding` intent. The new chat flow only handles questions that don't match existing command patterns.

### Dashboard Pages & Layout
- **D-06:** Repo card grid on the overview page — each card shows repo name, last audit date, score badge, and open finding count. Click through to per-repo detail page. Reuses existing shadcn Card + Badge components.
- **D-07:** Audit list table on the per-repo detail page — table rows with PR number/title, score badge, severity count pills, date, and report link. Sorted by most recent. Enterprise-dense aesthetic.
- **D-08:** Empty state: "No repos audited yet. @mention ClawGuard on a PR to get started." with a friendly onboarding message.
- **D-09:** Dashboard routes: `/dashboard` (overview grid), `/dashboard/[owner]/[repo]` (per-repo audit list).

### Config Reader & Defaults
- **D-10:** Fetch config per audit via Octokit Contents API from the repo's default branch before each audit starts. Octokit instance already available in `bot.ts`.
- **D-11:** Invalid YAML or unrecognized fields: warn and use defaults. Never block the pipeline on bad config. Mention the config warning in the summary card footer.
- **D-12:** Demo-friendly defaults when no config.yml exists: autoFix: true, severityThreshold: "medium", ignorePaths: [], model: gateway default. Aggressive defaults that showcase all features during demo.
- **D-13:** Policies from `.clawguard/policies.yml` injected into the ToolLoopAgent system prompt as additional security rules. Each policy has name, rule, and severity. Parsed with `yaml` package.
- **D-14:** Config schema validated with Zod after YAML parse. Valid fields: `autoFix`, `severityThreshold`, `ignorePaths`, `reportSettings`, `model`. Unknown fields ignored with warning.

### Auth & Data Scoping
- **D-15:** GitHub OAuth via BetterAuth (NOT NextAuth). Stack change from original plan — BetterAuth preferred over NextAuth 4.
- **D-16:** Public reports, private dashboard. Report URLs (`/report/[owner]/[repo]/[pr]`) remain shareable without auth. Dashboard (`/dashboard/*`) requires login.
- **D-17:** Dashboard data scoping: GitHub repos -> Redis scan. Use GitHub API to list repos the logged-in user has access to, then query Redis for matching audit keys (`{owner}/{repo}/pr/*`).
- **D-18:** Session stored in cookie. Standard BetterAuth GitHub OAuth provider configuration.

### Claude's Discretion
- Chat response formatting (markdown structure, code blocks, security callouts)
- BetterAuth configuration and middleware setup
- Redis conversation history schema and TTL
- Dashboard page component composition and responsive breakpoints
- Config Zod schema exact field types and defaults
- Policy injection prompt engineering (how custom rules are woven into system prompt)
- Redis key scanning strategy for dashboard data queries
- Loading states and error handling on dashboard pages

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Chat Requirements
- `.planning/REQUIREMENTS.md` §Follow-Up Chat — CHAT-01 through CHAT-04 (follow-up questions, contextual responses, conversation state, fix via chat)
- `.planning/REQUIREMENTS.md` §Security Analysis Pipeline — SCAN-09 (custom policies injection)

### Config Requirements
- `.planning/REQUIREMENTS.md` §Configuration System — CONF-01 through CONF-05 (config reader, config fields, policies reader, policy injection, sensible defaults)

### Dashboard Requirements
- `.planning/REQUIREMENTS.md` §Dashboard — DASH-01 through DASH-04 (GitHub OAuth, repo grid, per-repo audit list, Redis data source)

### Existing Bot Code
- `lib/bot.ts` — `detectIntent()` function, `onSubscribedMessage` handler (where chat follow-up integrates), `onNewMention`, `onAction` handlers, `octokit` instance
- `lib/redis.ts` — `AuditData` interface, `storeAuditResult()`/`getAuditResult()` helpers, Redis client setup
- `lib/analysis/pipeline.ts` — Where config/policies would be injected into ToolLoopAgent calls
- `lib/analysis/types.ts` — `AuditResult`, `Finding` schemas (context for chat AI)

### Stack & Auth
- `CLAUDE.md` §Technology Stack — BetterAuth replaces NextAuth. `yaml` package for config parsing. `@upstash/redis` for data storage.
- `.planning/research/STACK.md` — Package versions, Redis HTTP vs TCP gotcha

### Prior Phase Decisions
- `.planning/phases/01-foundation-bot-wiring/01-CONTEXT.md` — Chat SDK patterns, Redis key format, error handling
- `.planning/phases/02-security-analysis-pipeline/02-CONTEXT.md` — 3-phase analysis architecture, live progress updates, summary card design
- `.planning/phases/03-auto-fix-commit-loop/03-CONTEXT.md` — Intent detection, fix flow, action buttons
- `.planning/phases/04-interactive-web-report/04-CONTEXT.md` — shadcn/ui setup, dark theme, enterprise aesthetic

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/bot.ts` — `detectIntent()` for command routing, `onSubscribedMessage` hook point for chat, `octokit` instance for config fetching and GitHub API calls
- `lib/redis.ts` — `redis` client instance, `getAuditResult()` for loading audit context into chat responses, `storeAuditResult()` for persistence
- `lib/analysis/pipeline.ts` — `reviewPullRequest()` where config/policies would be injected, Sandbox setup pattern
- `lib/cards/summary-card.ts` — `buildSummaryCard()` for re-posting updated cards after config-aware re-audits
- `components/ui/` — shadcn/ui Card, Badge, Button, Tabs, Skeleton, Accordion already installed (New York style, zinc palette)
- `app/globals.css` — Tailwind v4 + shadcn CSS variables with dark mode via `prefers-color-scheme`
- `app/layout.tsx` — Root layout with Geist fonts, metadata configured

### Established Patterns
- Path alias `@/*` maps to repo root
- Named exports, no barrel files, direct imports
- Try/catch with generic error messages (no stack traces exposed)
- Sandbox lifecycle: create in try, stop in finally
- `maxDuration = 300` on webhook route
- shadcn/ui New York style, zinc base color, Tailwind v4 CSS config

### Integration Points
- `lib/bot.ts` `onSubscribedMessage` — Extend `unknown` intent branch to call chat AI instead of no-op
- `lib/analysis/pipeline.ts` — Inject config/policies before ToolLoopAgent calls
- `app/dashboard/` — New route group (to be created) with auth middleware
- `app/api/auth/` — BetterAuth API route (to be created)
- `lib/config.ts` — New module for config/policies reader (to be created)
- `lib/redis.ts` — Needs new functions for conversation history and dashboard data queries (scan by repo prefix)

</code_context>

<specifics>
## Specific Ideas

- The chat follow-up is what makes ClawGuard feel like an autonomous agent, not just a scanner — the judge for the "agents" track wants to see real conversational interaction
- BetterAuth over NextAuth — user preference, stack deviation from original plan
- Dashboard with repo card grid + audit table is the "SaaS product" signal for the YC judge — shows this isn't just a bot, it's a product
- Config/policies system shows extensibility and enterprise readiness — important for credibility with the cybersecurity judge
- Demo-friendly defaults (autoFix: true) mean the demo "just works" without needing config files in the demo repo

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-chat-config-dashboard*
*Context gathered: 2026-03-28*
