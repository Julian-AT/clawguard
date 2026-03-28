# Phase 3: Auto-Fix & Commit Loop - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

The agent autonomously fixes vulnerabilities by generating patches in a sandbox, validating them, committing to the PR branch via Octokit, and re-auditing to prove the fixes work. Users trigger fixes via action buttons in the summary card (Chat SDK JSX) and text commands in PR thread. This phase covers: single-finding fix, "Fix All" for CRITICAL+HIGH, post-fix re-audit, and updated summary card with new score.

Requirements: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, CARD-04

</domain>

<decisions>
## Implementation Decisions

### Fix Trigger Mechanism
- **D-01:** Both action buttons AND text commands supported. Action buttons in the summary card (Auto-Fix per finding, Auto-Fix All, View Report) for visual polish and demo impact. Text commands via @mention ("@clawguard fix all", "@clawguard fix the SQL injection in users.ts") for power users.
- **D-02:** Action buttons require Chat SDK JSX Card components — add `jsxImportSource: "chat"` to tsconfig and wire `bot.onAction` handler.
- **D-03:** Text commands require intent detection in the existing `onSubscribedMessage` handler to branch into the fix flow vs. re-audit vs. general response.

### Fix Generation Approach
- **D-04:** Tiered approach — try `Finding.fix.after` from stored audit first (fast path). If sandbox validation fails, fall back to a ToolLoopAgent that reads the full file context and generates a fresh fix (robust path).
- **D-05:** Fast path: apply `fix.after` content directly to the file in sandbox, run validation. No LLM call needed.
- **D-06:** Fallback path: spawn a ToolLoopAgent in the sandbox with the vulnerable file, finding details, and validation feedback. Agent iterates until fix passes validation or gives up.

### Fix Validation Depth
- **D-07:** Full validation suite — type check (`tsc --noEmit` for TS projects) + linting (auto-detect eslint/biome config) + run existing test suite if present.
- **D-08:** Auto-detect available validation tools in the sandbox after cloning. Use whatever the repo has configured.
- **D-09:** Validation must pass ALL available checks before the fix is committed.

### Fix Failure Handling
- **D-10:** Skip and report — post a brief failure note for that finding ("Could not auto-fix: validation failed") and continue to the next finding.
- **D-11:** "Fix All" processes all CRITICAL and HIGH findings sequentially, skipping any that fail validation after both tiers (fix.after + agent fallback).
- **D-12:** Final summary shows which findings were fixed vs. skipped, so the developer knows what still needs manual attention.

### Claude's Discretion
- Commit message format for auto-fix commits (should reference the finding type and CWE)
- How to structure the fix confirmation message in the PR thread
- Whether to create one commit per fix or batch commits
- Sandbox lifecycle management (reuse sandbox across fixes vs. fresh sandbox per fix)
- How the re-audit integrates with the existing `reviewPullRequest` pipeline
- ToolLoopAgent prompt engineering for the fallback fix generation
- How to auto-detect validation tools in the sandbox

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auto-Fix Requirements
- `.planning/REQUIREMENTS.md` §Auto-Fix & Commit Loop — FIX-01 through FIX-07 (fix generation, validation, commit, re-audit flow)
- `.planning/REQUIREMENTS.md` §PR Summary Card — CARD-04 (action buttons: Auto-Fix, Auto-Fix All, View Report)

### Existing Pipeline Code
- `lib/analysis/types.ts` — `Finding` schema with `fix.before`/`fix.after` fields, `AuditResult` schema with `allFindings`, `PhaseResult` schema
- `lib/analysis/pipeline.ts` — Sandbox clone pattern, `createBashTool`, ToolLoopAgent usage with `gateway("anthropic/claude-sonnet-4.6")`
- `lib/redis.ts` — `storeAuditResult()`/`getAuditResult()` helpers, `AuditData` envelope type
- `lib/bot.ts` — `onNewMention`/`onSubscribedMessage` handlers, `status.edit()` progress pattern, `octokit` instance
- `lib/cards/summary-card.ts` — `buildSummaryCard()`, `severityEmoji()`, `SEVERITY_ORDER` exports

### Chat SDK Action Buttons
- Chat SDK Actions: `https://chat-sdk.dev/docs/actions` — `onAction` handler for button clicks
- Chat SDK Cards: `https://chat-sdk.dev/docs/cards` — JSX card API (`Card`, `Actions`, `Button` components)

### GitHub Contents API (for commits)
- `@octokit/rest` v22.0.1 already installed — `octokit.repos.createOrUpdateFileContents()` for committing fixes

### Prior Phase Decisions
- `.planning/phases/01-foundation-bot-wiring/01-CONTEXT.md` — Error handling (D-07: generic messages only), Redis key format (D-06)
- `.planning/phases/02-security-analysis-pipeline/02-CONTEXT.md` — Live progress updates (D-07), finding confidence indicator (D-08), card design (D-01 through D-05)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Finding.fix.before`/`.after` — Pre-generated fix content from analysis pipeline, the fast-path input
- `getAuditResult()`/`storeAuditResult()` — Retrieve findings to fix, persist updated state after fixes
- Sandbox clone pattern from `pipeline.ts` — Identical setup for fix sandbox (git clone, checkout, createBashTool)
- `gateway("anthropic/claude-sonnet-4.6")` — Same AI provider for fallback ToolLoopAgent
- `octokit` instance in `bot.ts` — Already configured with GITHUB_TOKEN, needs `repos.createOrUpdateFileContents()`
- `thread.post()`/`status.edit()` — Same progress update UX pattern for fix status
- `buildSummaryCard()` — Re-call after re-audit to show improved score
- `severityEmoji()` and `SEVERITY_ORDER` — Reuse in fix status messages

### Established Patterns
- Path alias `@/*` maps to repo root
- Named exports, no barrel files, direct imports
- Try/catch with generic error messages (no stack traces exposed)
- Sandbox lifecycle: create in try, stop in finally
- `maxDuration = 300` on webhook route

### Integration Points
- `bot.ts` `onSubscribedMessage` — Add intent detection to branch into fix flow
- `bot.ts` — Add `onAction` handler for button clicks (new)
- `lib/fix.ts` — New module for fix agent, validation, commit logic
- `lib/cards/summary-card.ts` — Convert from raw Markdown to JSX Card with Action buttons
- `lib/redis.ts` — May need per-finding fix status tracking in `AuditData`

</code_context>

<specifics>
## Specific Ideas

- The tiered fix approach (fast path + agent fallback) should keep demo speed fast for easy fixes while being robust for edge cases
- Action buttons in the summary card are critical for demo wow factor — visual, clickable interaction beats typing text commands
- Full validation (type check + lint + tests) makes auto-fixes credible for the cybersecurity judge — not just blindly committing AI-generated code
- The skip-and-report pattern for failures keeps the demo flowing even if some fixes can't be applied

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-auto-fix-commit-loop*
*Context gathered: 2026-03-28*
