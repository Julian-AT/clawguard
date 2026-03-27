# Phase 1: Foundation & Bot Wiring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 01-foundation-bot-wiring
**Areas discussed:** Chat SDK risk strategy, Bot acknowledgment UX, Redis data structure, Error handling in PR thread

---

## Chat SDK Risk Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Chat SDK first, Octokit fallback | Build with Chat SDK targeting Next.js route handlers. If it doesn't work within 2 hours, fall back to direct Octokit + manual webhook parsing. | ✓ |
| Direct Octokit from the start | Skip Chat SDK entirely. Parse webhooks manually, post comments via Octokit REST API. No JSX cards or streaming. | |
| Chat SDK, no fallback | Commit fully to Chat SDK. Work through issues rather than pivoting. | |
| You decide | Claude picks the approach based on what works best technically. | |

**User's choice:** Chat SDK first, Octokit fallback
**Notes:** Aligns with the 2-hour timebox spike already noted in STATE.md. Preserves access to cards, streaming, and thread management while managing risk.

---

## Bot Acknowledgment UX

| Option | Description | Selected |
|--------|-------------|----------|
| Simple text reply | Plain message "Starting security audit..." immediately. | |
| Phased status updates | Initial acknowledgment, then edits/updates as each analysis phase completes. | ✓ |
| Streaming output | Use Chat SDK's fullStream for real-time progress. | |
| You decide | Claude picks based on Chat SDK capabilities. | |

**User's choice:** Phased status updates
**Notes:** Gives demo audience a sense of progress. More impressive than static text.

### Follow-up: Phase 1 output format

| Option | Description | Selected |
|--------|-------------|----------|
| Bare minimum | Just confirm pipeline ran: "Audit complete. Found N issues." Plain text. | |
| Light preview | Simple markdown with score and finding titles. Not full card. | |
| You decide | Claude picks whatever proves the chain works best. | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** Phase 1 success criteria only requires acknowledgment. Full summary card is Phase 2. Claude has flexibility on how polished the Phase 1 output is.

---

## Redis Data Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Lock the schema now | Define full JSON shape upfront. Rigid but predictable. | |
| Minimal seed, evolve per phase | Bare minimum in Phase 1, each subsequent phase extends. | ✓ |
| Store raw agent output + envelope | Thin envelope around whatever the agent produces. | |
| You decide | Claude picks based on what keeps downstream phases unblocked. | |

**User's choice:** Minimal seed, evolve per phase
**Notes:** Flexible approach. Phase 1 stores bare essentials, schema grows as report page, dashboard, and re-audit flow define their needs.

---

## Error Handling in PR Thread

| Option | Description | Selected |
|--------|-------------|----------|
| Specific diagnostics | Post actual errors to the thread. Helpful but exposes internals. | |
| Friendly generic errors | Clean messages, no internals exposed. Polished look. | ✓ |
| Tiered approach | Known failures get specific messages, unknown get generic. | |
| You decide | Claude picks balancing reliability and speed. | |

**User's choice:** Friendly generic errors
**Notes:** Keeps the demo looking polished. No internal diagnostics exposed to PR thread.

---

## Claude's Discretion

- Phase 1 final output format (bare minimum vs light preview)
- waitUntil/after() pattern for background processing
- Webhook signature verification implementation
- Idempotency mechanism
- Redis connection setup details

## Deferred Ideas

None — discussion stayed within phase scope
