---
phase: 02-security-analysis-pipeline
plan: 02
subsystem: analysis
tags: [ai-sdk, toolloopagent, vercel-sandbox, zod-structured-output, security-pipeline]

requires:
  - phase: 02-01
    provides: "Analysis types (FindingSchema, PhaseResultSchema, AuditResultSchema), scoring module (calculateScore, countBySeverity)"
provides:
  - "3-phase AI security analysis agents (quality, vulnerability, threat)"
  - "Pipeline orchestrator with sequential execution and progress callbacks"
  - "Updated review.ts returning structured AuditResult"
affects: [02-03, 03-interactive-report, 04-v0-report-generation]

tech-stack:
  added: []
  patterns:
    - "ToolLoopAgent with Output.object for Zod-validated structured output"
    - "Sequential pipeline with shared Sandbox session"
    - "Progress callback pattern for pipeline-to-caller communication"
    - "Error-resilient agent execution with empty fallback results"

key-files:
  created:
    - lib/analysis/phase1-quality.ts
    - lib/analysis/phase2-vuln.ts
    - lib/analysis/phase3-threat.ts
    - lib/analysis/pipeline.ts
    - tests/analysis/pipeline.test.ts
  modified:
    - lib/review.ts
    - lib/bot.ts
    - tests/review.test.ts

key-decisions:
  - "Each agent uses stepCountIs(25-30) to allow sufficient tool calls plus structured output generation"
  - "Pipeline uses 10-minute sandbox timeout for 3-phase sequential analysis"
  - "Agents return empty findings on error rather than propagating failures to keep pipeline flowing"
  - "review.ts simplified to thin wrapper delegating to pipeline module"

patterns-established:
  - "Agent module pattern: ToolLoopAgent + Output.object + error fallback"
  - "Pipeline pattern: shared sandbox, sequential phases, context forwarding, progress callbacks"
  - "Test mock pattern: vi.hoisted with default result objects restored in beforeEach"

requirements-completed: [SCAN-02, SCAN-03, SCAN-04]

duration: 6min
completed: 2026-03-27
---

# Phase 02 Plan 02: 3-Phase Security Pipeline Summary

**3-phase ToolLoopAgent pipeline (quality review, vulnerability scan, threat model) with Zod-validated structured output, sequential execution in shared Sandbox, and progress callback orchestration**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-27T22:21:24Z
- **Completed:** 2026-03-27T22:27:43Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Three focused AI security analysis agents producing Zod-validated PhaseResult via Output.object
- Pipeline orchestrator running phases sequentially, forwarding context between phases
- Pipeline aggregates all findings and calculates score/grade/severity counts
- review.ts refactored to thin wrapper returning structured AuditResult (was returning string)
- bot.ts cleaned up to remove unsafe type cast now that review returns AuditResult directly
- 13 new/updated tests, full suite of 64 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 3-Phase Analysis Agent Modules** - `8d1d9f8` (feat)
2. **Task 2: Create Pipeline Orchestrator, Update Review Module, and Add Tests** - `d3f4e0a` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `lib/analysis/phase1-quality.ts` - Code quality review agent (SCAN-02) with 25-step limit
- `lib/analysis/phase2-vuln.ts` - Vulnerability scan agent (SCAN-03) with 30-step limit, receives phase 1 context
- `lib/analysis/phase3-threat.ts` - Threat model agent (SCAN-04) with 25-step limit, receives phase 1+2 context
- `lib/analysis/pipeline.ts` - Pipeline orchestrator with progress callbacks, 10min sandbox timeout
- `lib/review.ts` - Refactored to thin wrapper around pipeline, returns AuditResult
- `lib/bot.ts` - Removed TODO cast, now uses AuditResult directly from review
- `tests/analysis/pipeline.test.ts` - 10 tests covering phase ordering, context passing, aggregation, progress callbacks
- `tests/review.test.ts` - 3 tests updated for new AuditResult return type

## Decisions Made
- stepCountIs(25) for quality and threat agents, stepCountIs(30) for vulnerability agent (needs more tool calls for deeper exploration)
- 10-minute sandbox timeout to accommodate 3 sequential agent phases (per research Pitfall 3)
- Each agent catches all errors and returns empty findings rather than crashing the pipeline
- review.ts is now a pure delegation wrapper -- all logic lives in pipeline.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed unsafe type cast in bot.ts**
- **Found during:** Task 2 (Update Review Module)
- **Issue:** bot.ts had `reviewResult as unknown as AuditResult` cast and a TODO(02-02) comment. With review.ts now returning AuditResult directly, the cast was both unnecessary and masked potential type errors.
- **Fix:** Removed the `as unknown as` cast and TODO comment. reviewResult is now typed correctly.
- **Files modified:** lib/bot.ts
- **Verification:** TypeScript compiles cleanly, all tests pass
- **Committed in:** d3f4e0a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical - type safety)
**Impact on plan:** Auto-fix was necessary for type safety. No scope creep.

## Issues Encountered
- Pipeline test mock paths initially used relative-to-pipeline paths instead of relative-to-test-file paths, causing real AI SDK calls. Fixed by using `../../lib/analysis/` prefix.
- `beforeEach` with `vi.clearAllMocks()` cleared agent mock implementations. Fixed by restoring defaults from extracted constants in beforeEach.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all modules are fully wired with real implementations.

## Next Phase Readiness
- Pipeline is complete and tested, ready for Plan 03 (bot handler integration with progress updates and summary card posting)
- All 3 agent modules produce structured PhaseResult compatible with AuditResultSchema
- Progress callback pattern ready for bot.ts to hook into for live PR comment updates

---
*Phase: 02-security-analysis-pipeline*
*Completed: 2026-03-27*

## Self-Check: PASSED

All 5 created files verified on disk. All 3 modified files verified on disk. Both task commits (8d1d9f8, d3f4e0a) found in git log. SUMMARY.md exists.
