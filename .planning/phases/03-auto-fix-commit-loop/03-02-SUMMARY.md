---
phase: 03-auto-fix-commit-loop
plan: 02
subsystem: ui
tags: [chat-sdk, jsx, card, summary-card, action-buttons]

# Dependency graph
requires:
  - phase: 02-security-analysis-pipeline
    provides: AuditResult type, Finding type, countBySeverity function, existing summary card
provides:
  - JSX Card version of buildSummaryCard with action labels and LinkButton
  - CARD-04 action elements (Fix All button, View Report link, text command instructions)
affects: [03-auto-fix-commit-loop, 04-interactive-web-report]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-file JSX pragma (@jsxImportSource chat) for Chat SDK card files"
    - "Button renders as bold text on GitHub (non-clickable), LinkButton as clickable link"
    - "Text command instructions as primary fix trigger (GitHub buttons not interactive)"

key-files:
  created:
    - lib/cards/summary-card.tsx
  modified:
    - tests/cards/summary-card.test.ts

key-decisions:
  - "Per-file @jsxImportSource chat pragma instead of global tsconfig change to avoid breaking React components"
  - "Text command instructions included in card since GitHub Button components render as non-clickable bold text"

patterns-established:
  - "Chat SDK JSX Card pattern: @jsxImportSource chat pragma, import components from chat, return JSX element"
  - "Source code analysis (readFileSync) for testing JSX Card structure without Chat SDK runtime initialization"

requirements-completed: [CARD-04, FIX-07]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 3 Plan 02: Summary Card JSX Conversion Summary

**Chat SDK JSX Card with Fix All button, View Report LinkButton, and text command instructions for CARD-04 action elements**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T23:40:37Z
- **Completed:** 2026-03-27T23:45:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Converted summary card from raw Markdown string builder to Chat SDK JSX Card format
- Added CARD-04 action elements: Button for Fix All, LinkButton for View Report, text instructions for fix commands
- Updated test suite to source code analysis pattern for JSX structure verification (14 tests pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert summary-card.ts to summary-card.tsx with JSX Card** - `9bcb9d8` (feat)
2. **Task 2: Update summary card tests for JSX Card format** - `d0237d8` (test)

## Files Created/Modified
- `lib/cards/summary-card.tsx` - JSX Card version with @jsxImportSource chat, Button/LinkButton actions, severity Fields, findings Table
- `lib/cards/summary-card.ts` - Deleted (replaced by .tsx)
- `tests/cards/summary-card.test.ts` - Updated to readFileSync source analysis pattern for JSX structure tests

## Decisions Made
- Used per-file `@jsxImportSource chat` pragma instead of changing global tsconfig.json `jsx` setting, to avoid breaking React components in the rest of the app (Pitfall 6 from research)
- Included text command instructions (`@clawguard fix all`, `@clawguard fix <type>`) in the card body since GitHub renders Button components as non-clickable bold text

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- buildSummaryCard now returns JSX instead of string, compatible with Chat SDK thread.post() and status.edit()
- The same function is called by the re-audit flow (Plan 03) to post updated scores after fixes
- Bot import path unchanged - TypeScript resolves .tsx automatically

## Self-Check: PASSED

---
*Phase: 03-auto-fix-commit-loop*
*Completed: 2026-03-28*
