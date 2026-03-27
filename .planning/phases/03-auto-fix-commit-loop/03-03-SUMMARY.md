---
phase: 03-auto-fix-commit-loop
plan: 03
subsystem: fix-pipeline
tags: [fix-orchestrator, intent-detection, bot-integration, re-audit, sandbox, chat-sdk]

# Dependency graph
requires:
  - phase: 03-auto-fix-commit-loop
    provides: Fix pipeline modules (apply, validate, commit, agent), JSX summary card with action elements
provides:
  - fixFinding orchestrator (tiered fast-path + agent fallback)
  - fixAll orchestrator (CRITICAL+HIGH sequential with sandbox reuse and re-audit)
  - detectIntent function for routing fix-all, fix-finding, re-audit commands
  - runFixFlow helper with per-fix confirmations and summary table
  - onAction handler for fix-all (future platform support)
affects: [04-interactive-web-report]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tiered fix orchestration: fixFinding composes applyStoredFix -> generateFixWithAgent -> commitFixToGitHub"
    - "Single sandbox reuse across all fixAll findings with git pull sync after each commit"
    - "Intent detection pattern: parse @mention text for fix-all, fix-finding, re-audit, unknown"
    - "Per-fix progress callbacks via onFixProgress for real-time status updates"

key-files:
  created:
    - lib/fix/index.ts
    - tests/fix/index.test.ts
  modified:
    - lib/bot.ts
    - tests/bot.test.ts

key-decisions:
  - "fixFinding returns skipped status (not throws) on both tiers failing, allowing fixAll to continue to next finding"
  - "detectIntent exported for testability and potential reuse in webhook route"
  - "Existing bot test for createGitHubAdapter adjusted from () to ( to match actual parameterized call"

patterns-established:
  - "Fix orchestrator pattern: tiered approach with fast-path first, agent fallback, skip on both failing"
  - "Intent detection pattern: lowercase text parsing after @mention extraction"
  - "Summary table pattern: Markdown table with finding/status/commit columns posted via status.edit"

requirements-completed: [FIX-04, FIX-05, FIX-06]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 03 Plan 03: Fix Orchestrator and Bot Integration Summary

**Fix orchestrator with tiered fixFinding/fixAll, intent detection for @mention commands, per-fix confirmations, summary table, and re-audit flow**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T23:51:06Z
- **Completed:** 2026-03-27T23:54:43Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Built fixFinding orchestrator composing fast-path stored fix + agent fallback with commit on success
- Built fixAll orchestrator processing CRITICAL+HIGH findings sequentially in single sandbox with re-audit
- Added intent detection (detectIntent) routing fix-all, fix-finding, re-audit, and unknown intents
- Added runFixFlow with per-fix confirmations (commit SHA), skip messages, and final summary table
- Added onAction handler for fix-all (future Slack/Discord platform support)
- 53 tests passing across fix orchestrator (21) and bot (32) test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create fix orchestrator with fixFinding and fixAll** - `3c7412c` (feat)
2. **Task 2: Update bot.ts with intent detection, onAction, and fix flow** - `c0f4bb4` (feat)
3. **Task 3: Create tests for fix orchestrator and updated bot** - `302dc68` (test)

## Files Created/Modified
- `lib/fix/index.ts` - fixFinding (tiered approach) and fixAll (CRITICAL+HIGH sequential with re-audit)
- `lib/bot.ts` - detectIntent, runFixFlow, onAction("fix-all"), updated onSubscribedMessage
- `tests/fix/index.test.ts` - 21 tests for fix orchestration and re-audit flow
- `tests/bot.test.ts` - 22 new tests added (intent detection, fix flow, action handler, routing)

## Decisions Made
- fixFinding returns skipped status (not throws) on both tiers failing, allowing fixAll to continue processing remaining findings
- detectIntent exported as a named export for testability and potential reuse
- Existing bot test adjusted: `createGitHubAdapter()` changed to `createGitHubAdapter(` to match actual parameterized call signature

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed existing test assertion for createGitHubAdapter**
- **Found during:** Task 3 (tests)
- **Issue:** Existing test checked for `createGitHubAdapter()` but actual code uses `createGitHubAdapter({...})` with parameters
- **Fix:** Changed assertion from `toContain("createGitHubAdapter()")` to `toContain("createGitHubAdapter(")`
- **Files modified:** tests/bot.test.ts
- **Verification:** All existing tests pass
- **Committed in:** 302dc68 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor test assertion fix for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete auto-fix pipeline wired end-to-end: bot.ts -> fix/index.ts -> fix/{apply,agent,commit}.ts
- Intent detection routes @mention commands to fix pipeline or re-audit
- Re-audit flow triggers reviewPullRequest and posts updated summary card
- Phase 03 (auto-fix-commit-loop) is complete -- all 3 plans delivered
- Ready for Phase 04 (interactive-web-report)

## Self-Check: PASSED
