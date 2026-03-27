# Phase 1: Foundation & Bot Wiring - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove the full infrastructure chain end-to-end: a GitHub @mention reaches the app, triggers background processing in a Vercel Sandbox, stores results in Upstash Redis, and posts a response to the PR thread. This validates Chat SDK + Next.js integration, webhook handling, sandbox connectivity, Redis storage, and AI Gateway access. No security analysis logic — just the plumbing.

Requirements: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05, SCAN-01, SCAN-07, SCAN-08

</domain>

<decisions>
## Implementation Decisions

### Chat SDK Integration Strategy
- **D-01:** Lead with Chat SDK + GitHub adapter targeting Next.js route handlers. If integration fails within a 2-hour timebox, fall back to direct Octokit + manual webhook parsing.
- **D-02:** The fallback means losing JSX cards, streaming, and built-in thread management — those would be reimplemented with plain GFM markdown and Octokit REST calls.

### Bot Acknowledgment UX
- **D-03:** Use phased status updates — post an immediate acknowledgment message when the @mention is received, then edit/update the message as each processing step completes (cloning, analyzing, storing, done).
- **D-04:** This gives the demo audience a sense of live progress rather than a silent wait.

### Redis Data Structure
- **D-05:** Phase 1 stores the bare minimum — raw output plus key metadata (timestamp, PR info, trigger source, status). The schema evolves as downstream phases (report, dashboard, re-audit) define their data needs.
- **D-06:** Key format: `{owner}/{repo}/pr/{number}` as specified in project requirements.

### Error Handling
- **D-07:** Post friendly generic error messages to the PR thread when the pipeline fails. No internal diagnostics exposed — keep it looking polished for the demo.

### Claude's Discretion
- How polished the Phase 1 final posted message is (bare minimum confirmation vs. light data preview) — whatever best proves the chain works end-to-end
- Specific `waitUntil` / `after()` pattern for background processing in Next.js route handlers
- Webhook signature verification implementation approach
- Idempotency mechanism for preventing duplicate event processing
- Redis connection setup (HTTP REST via @upstash/redis for audit data, TCP via redis@5 for Chat SDK state)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Chat SDK Integration
- `clawguard-plan.md` §3 (Architecture) — File structure, route layout, data flow for the single Next.js deployment
- `clawguard-plan.md` §4 (Tech Stack) — Key references section with Chat SDK docs URLs
- Chat SDK code review guide: `https://chat-sdk.dev/docs/guides/code-review-hono` — Foundation pattern to adapt from Hono to Next.js route handlers
- Chat SDK Cards: `https://chat-sdk.dev/docs/cards` — JSX card API (requires `jsxImportSource: "chat"` in tsconfig)
- Chat SDK Streaming: `https://chat-sdk.dev/docs/streaming` — `fullStream` for real-time output
- Chat SDK Actions: `https://chat-sdk.dev/docs/actions` — `onAction` handler for button clicks

### Stack & Compatibility
- `.planning/research/STACK.md` — Verified package versions, compatibility notes, critical gotchas (Redis TCP vs HTTP, Tailwind v4 config, Zod 4 differences)

### Requirements
- `.planning/REQUIREMENTS.md` §Webhook & Bot Integration — HOOK-01 through HOOK-05
- `.planning/REQUIREMENTS.md` §Security Analysis Pipeline — SCAN-01, SCAN-07, SCAN-08

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes the foundational patterns all subsequent phases will follow

### Integration Points
- `/app/api/webhooks/github/route.ts` — Webhook entry point (to be created)
- `/lib/bot.ts` — Chat SDK instance with GitHub adapter (to be created)
- Upstash Redis — audit result storage (to be configured)
- Vercel Sandbox — repo cloning and analysis environment (to be wired)
- Vercel AI Gateway — ToolLoopAgent provider (to be connected)

</code_context>

<specifics>
## Specific Ideas

- The battle plan (`clawguard-plan.md`) is extremely detailed on architecture, file layout, and data flow — downstream agents should treat it as the source of truth for structural decisions
- Chat SDK code review guide (Hono-based) is the pattern to adapt, not reinvent — same review function, sandbox setup, and bot event handlers, just inside Next.js route handlers
- This is a hackathon project — speed and working demo trump perfect abstractions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-bot-wiring*
*Context gathered: 2026-03-27*
