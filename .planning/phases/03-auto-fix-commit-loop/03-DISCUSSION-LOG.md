# Phase 3: Auto-Fix & Commit Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 03-auto-fix-commit-loop
**Areas discussed:** Fix trigger mechanism, Fix generation approach, Fix validation depth, Fix failure handling

---

## Fix Trigger Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Action buttons in card | Chat SDK JSX Card with clickable Auto-Fix / Auto-Fix All / View Report buttons. Most polished UX for demo. Requires jsxImportSource + onAction handler. | |
| Text commands only | User types "@clawguard fix all" or "@clawguard fix the SQL injection". Simpler — extends existing onSubscribedMessage. Less visual wow. | |
| Both buttons and text | Action buttons for demo polish AND text commands for power users. More work but covers both interaction patterns. | ✓ |
| You decide | Let Claude pick most pragmatic approach. | |

**User's choice:** Both buttons and text
**Notes:** None — user selected without additional context.

---

## Fix Generation Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Use existing fix.after | Apply Finding.fix.after from stored audit directly. Fast — no second LLM call. | |
| Fresh agent fix | Spawn ToolLoopAgent in sandbox to re-analyze and generate fresh fix. Slower (30-60s) but reads full file context. | |
| Tiered: try fix.after, fall back to agent | Start with fix.after. If validation fails, fall back to ToolLoopAgent. Fast when fix.after works, robust when it doesn't. | ✓ |

**User's choice:** Tiered: try fix.after, fall back to agent
**Notes:** None — user selected without additional context.

---

## Fix Validation Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Syntax/type check only | tsc --noEmit or basic syntax check. Fast (~5s). Won't catch logic bugs. | |
| Type check + linting | Type check + auto-detect eslint/biome. Catches style violations. Adds ~10s. | |
| Type check + lint + tests | Full suite — type check, lint, run existing test suite. Most thorough but could take minutes. | ✓ |
| You decide | Let Claude auto-detect and pick based on available tools. | |

**User's choice:** Type check + lint + tests
**Notes:** None — user selected without additional context.

---

## Fix Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Skip and report | Post failure note for that finding, continue to next. Fix All still processes everything. Final card shows fixed vs skipped. | ✓ |
| Retry once then skip | Try fix.after, then agent fallback, then skip. Two attempts before giving up. | |
| Fail fast | Stop entire Fix All flow on first failure. Post what was accomplished so far. | |

**User's choice:** Skip and report
**Notes:** None — user selected without additional context.

---

## Claude's Discretion

- Commit message format for auto-fix commits
- Fix confirmation message structure in PR thread
- One commit per fix vs batched commits
- Sandbox lifecycle management (reuse vs fresh per fix)
- Re-audit integration with existing reviewPullRequest pipeline
- ToolLoopAgent prompt engineering for fallback fix generation
- Auto-detection of validation tools in sandbox

## Deferred Ideas

None — discussion stayed within phase scope
