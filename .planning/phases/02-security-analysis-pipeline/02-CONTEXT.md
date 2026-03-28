# Phase 2: Security Analysis Pipeline - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the 3-phase security audit pipeline (code quality review, vulnerability scan, threat model) that produces structured findings with severity scores and CWE/OWASP mappings. Post a branded summary card with results to the PR thread. This phase transforms the existing single-pass plain-text agent (`lib/review.ts`) into a structured, multi-phase analysis pipeline with Zod-validated output.

Requirements: SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06, CARD-01, CARD-02, CARD-03

</domain>

<decisions>
## Implementation Decisions

### Summary Card Design
- **D-01:** Score-first layout with findings table. ClawGuard branded header (e.g., "ClawGuard Security Audit: 72/100 (C)").
- **D-02:** Severity count badges inline below the score (CRITICAL: N | HIGH: N | MEDIUM: N | LOW: N).
- **D-03:** Markdown table showing top 5 findings by severity (columns: Severity | Finding | Location).
- **D-04:** "View Full Report" link at the bottom pointing to `/report/[owner]/[repo]/[pr]`.
- **D-05:** Card table only shows MEDIUM+ severity findings. LOW and INFO are stored in audit JSON and appear in the full report, not the card.

### Analysis Architecture
- **D-06:** Full 3-phase sequential analysis — three separate ToolLoopAgent calls, each feeding context to the next. Phase 1 (Code Quality Review) -> Phase 2 (Vulnerability Scan) -> Phase 3 (Threat Model).
- **D-07:** Live phase progress updates — bot edits the PR comment in real-time as each analysis phase completes, showing checkmarks for completed phases and a spinner/hourglass for the current phase. Final summary card replaces the progress message.

### Finding Quality
- **D-08:** Each finding includes a confidence indicator (high/medium/low) to acknowledge LLM uncertainty. Adds credibility with security-aware judges.
- **D-09:** All severities stored in the audit JSON data. Card filters to MEDIUM+ for impact.

### Score Calculation
- **D-10:** Fixed deduction formula from requirements: CRITICAL=-25, HIGH=-15, MEDIUM=-8, LOW=-3, INFO=-1. Starting score is 100. Floor at 0.
- **D-11:** Score + grade + severity badge counts shown in card. Detailed deduction breakdown lives in the full report page (Phase 4), not the card.

### Claude's Discretion
- Exact agent system prompts and prompt engineering for each analysis phase
- Zod schema structure for findings (must satisfy SCAN-05 field requirements)
- How context flows between the 3 sequential phases (full output vs. summary)
- GFM markdown formatting details for severity badges (emoji, bold, etc.)
- Error handling within individual analysis phases (retry vs. skip vs. fail)
- `AuditData` schema evolution from `string` to structured type

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Security Analysis Requirements
- `.planning/REQUIREMENTS.md` §Security Analysis Pipeline — SCAN-02 through SCAN-06 (3-phase analysis, finding fields, scoring formula)
- `.planning/REQUIREMENTS.md` §PR Summary Card — CARD-01 through CARD-03 (card content, findings table, report link)

### Existing Pipeline Code
- `lib/review.ts` — Current single-phase ToolLoopAgent implementation (to be replaced with 3-phase structure)
- `lib/redis.ts` — `AuditData` interface and store/get helpers (result type needs to change from `string` to structured)
- `lib/bot.ts` — `onNewMention`/`onSubscribedMessage` handlers with status edit pattern (to be extended with phase progress updates)

### Stack & Compatibility
- `.planning/research/STACK.md` — Package versions, Zod 4 API differences, AI SDK structured output compatibility notes
- `.planning/phases/01-foundation-bot-wiring/01-CONTEXT.md` — Phase 1 decisions (Chat SDK patterns, error handling, Redis structure)

### Chat SDK Card API
- Chat SDK Cards: `https://chat-sdk.dev/docs/cards` — JSX card rendering (requires `jsxImportSource: "chat"` in tsconfig)
- Chat SDK Streaming: `https://chat-sdk.dev/docs/streaming` — For potential streaming output

### AI SDK Agent Docs
- AI SDK Agents: `https://ai-sdk.dev/docs/foundations/agents` — ToolLoopAgent configuration, structured output with Zod

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/review.ts` — `reviewPullRequest()` function with Sandbox setup (clone, checkout, diff). The sandbox orchestration can be reused; the agent prompt and return type need complete replacement.
- `lib/redis.ts` — `storeAuditResult()`/`getAuditResult()` helpers with key pattern. Store function works but `AuditData.result` type must change from `string` to structured findings.
- `lib/bot.ts` — `status.edit()` pattern for live message updates. Already proven in Phase 1 for ack → progress → done flow.
- `@ai-sdk/gateway` — `gateway("anthropic/claude-sonnet-4.6")` provider already configured and tested.
- `zod@4.3.6` — Installed but unused. Ready for structured output schemas.

### Established Patterns
- Path alias `@/*` maps to repo root (e.g., `@/lib/redis`)
- Named exports for utilities, const exports for singletons
- No barrel files — direct imports
- Try/catch with generic error messages posted to PR thread (no stack traces exposed)
- Sandbox lifecycle: create in try, stop in finally
- `maxDuration = 300` on webhook route for long-running analysis

### Integration Points
- `reviewPullRequest()` called from `bot.ts` handlers — return type change affects both `onNewMention` and `onSubscribedMessage`
- `storeAuditResult()` called after review — must accept new structured type
- Webhook route `waitUntil` keeps function alive during multi-phase analysis (already supports 300s)
- `tsconfig.json` needs `jsxImportSource: "chat"` for JSX card rendering

</code_context>

<specifics>
## Specific Ideas

- The summary card should look professional and enterprise-grade, not like a toy hackathon project. Think GitHub's own security alerts UI.
- Live progress updates during analysis are critical for the demo — the audience needs to see something happening during the 2-4 minute wait.
- Confidence indicators on findings help with the cybersecurity judge (Alexis Lingad) — shows awareness of LLM limitations rather than pretending to be a perfect scanner.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-security-analysis-pipeline*
*Context gathered: 2026-03-27*
