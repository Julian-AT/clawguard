---
phase: 02-security-analysis-pipeline
plan: 01
subsystem: analysis
tags: [zod, scoring, gfm-card, redis, types]

# Dependency graph
requires:
  - phase: 01-foundation-bot-wiring
    provides: "Next.js scaffold, Redis client, bot handlers, review pipeline"
provides:
  - "Zod schemas for Finding, PhaseResult, AuditResult (all downstream plans import)"
  - "calculateScore and countBySeverity scoring functions"
  - "buildSummaryCard GFM markdown card builder"
  - "AuditData.result typed as AuditResult (structured, not string)"
affects: [02-02, 02-03, 03-auto-fix, 04-interactive-report]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod z.object() schemas with .describe() for AI structured output guidance"
    - "Fixed deduction scoring formula: CRITICAL=-25, HIGH=-15, MEDIUM=-8, LOW=-3, INFO=-1"
    - "GFM markdown card builder with severity emoji mapping and top-5 MEDIUM+ filter"
    - "makeFinding() test helper pattern for reusable Finding fixtures"

key-files:
  created:
    - lib/analysis/types.ts
    - lib/analysis/scoring.ts
    - lib/cards/summary-card.ts
    - tests/analysis/types.test.ts
    - tests/analysis/scoring.test.ts
    - tests/cards/summary-card.test.ts
  modified:
    - lib/redis.ts
    - lib/bot.ts
    - tests/redis.test.ts

key-decisions:
  - "z.object() only (not z.interface()) for Zod schemas -- z.interface does not exist in zod@4.3.6"
  - "GFM plain string card over JSX cards -- simpler, identical GitHub rendering"
  - "Temporary type cast in bot.ts for AuditResult -- reviewPullRequest returns string until pipeline refactor in 02-02"

patterns-established:
  - "makeFinding(overrides) helper for test data -- avoids 15+ fields per test case"
  - "SEVERITY_ORDER constant for deterministic sorting across modules"
  - "countBySeverity returns Record<string, number> with all 5 severity keys initialized"

requirements-completed: [SCAN-05, SCAN-06, CARD-01, CARD-02, CARD-03]

# Metrics
duration: 4min
completed: 2026-03-27
---

# Phase 2 Plan 01: Types, Scoring & Card Summary

**Zod schemas for all finding fields (SCAN-05 + D-08 confidence), deterministic scoring with fixed deductions (D-10), and GFM summary card with branded header, severity badges, top-5 findings table, and report link**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T22:02:04Z
- **Completed:** 2026-03-27T22:06:26Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Zod schemas validate all 12 SCAN-05 finding fields plus D-08 confidence indicator, with .describe() annotations for AI structured output
- Scoring module produces exact deductions per D-10 formula with correct grade thresholds (A through F)
- Summary card builder produces GFM markdown matching D-01 through D-05 decisions (branded header, severity badges, MEDIUM+ table, report link)
- AuditData.result upgraded from plain string to structured AuditResult type
- 40 new tests across 3 test files, 55 total tests passing with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Analysis Types and Scoring Module with Tests** - `daedc71` (feat) - TDD: RED then GREEN, 29 tests
2. **Task 2: Create Summary Card Builder and Update Redis Types** - `70ec695` (feat) - 11 new card tests, 3 updated redis tests

## Files Created/Modified
- `lib/analysis/types.ts` - Zod schemas: FindingSchema, PhaseResultSchema, AuditResultSchema, SeveritySchema, ConfidenceSchema + inferred types
- `lib/analysis/scoring.ts` - calculateScore (fixed deduction formula), countBySeverity, DEDUCTIONS, GRADE_THRESHOLDS
- `lib/cards/summary-card.ts` - buildSummaryCard (GFM markdown), severityEmoji, SEVERITY_ORDER
- `lib/redis.ts` - AuditData.result changed from string to AuditResult
- `lib/bot.ts` - Temporary type cast for reviewPullRequest return until pipeline refactor
- `tests/analysis/types.test.ts` - 13 tests for Zod schema validation
- `tests/analysis/scoring.test.ts` - 16 tests for scoring and grade boundaries
- `tests/cards/summary-card.test.ts` - 11 tests for card builder (CARD-01, CARD-02, CARD-03)
- `tests/redis.test.ts` - 3 updated tests using structured AuditResult

## Decisions Made
- Used z.object() exclusively -- z.interface() does not exist in installed zod@4.3.6 (confirmed by research)
- Built card as plain GFM markdown string rather than JSX cards -- identical GitHub rendering, simpler implementation
- Added temporary `as unknown as AuditResult` cast in bot.ts to maintain compile while reviewPullRequest still returns string (will be properly typed when pipeline refactor lands in 02-02)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript compile error in bot.ts after AuditData type change**
- **Found during:** Task 2 (Redis type update)
- **Issue:** Changing AuditData.result from string to AuditResult caused TS2322 in bot.ts where reviewPullRequest returns string
- **Fix:** Added temporary type cast with TODO comment pointing to 02-02 pipeline refactor
- **Files modified:** lib/bot.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 70ec695 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal -- temporary cast will be removed when review.ts returns AuditResult in 02-02. No scope creep.

## Issues Encountered
None -- plan executed cleanly after the expected Pitfall 4 type propagation issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All type contracts stable -- Plans 02 and 03 can import FindingSchema, AuditResultSchema, calculateScore, buildSummaryCard
- Scoring formula verified with exhaustive grade boundary tests
- Card builder verified with edge cases (zero findings, 7+ findings, severity sorting)
- Redis layer ready for structured audit data storage

---
*Phase: 02-security-analysis-pipeline*
*Completed: 2026-03-27*
