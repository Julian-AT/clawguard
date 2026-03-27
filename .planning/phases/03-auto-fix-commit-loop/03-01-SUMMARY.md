---
phase: 03-auto-fix-commit-loop
plan: 01
subsystem: fix-pipeline
tags: [sandbox, octokit, toolloopagent, validation, auto-fix, vercel-ai-sdk]

# Dependency graph
requires:
  - phase: 02-security-analysis-pipeline
    provides: Finding type with fix.before/fix.after, Sandbox patterns, ToolLoopAgent usage
provides:
  - FixResult, FixContext, ValidationResult, ApplyResult type interfaces
  - applyStoredFix function for fast-path fix application with whitespace normalization
  - runValidation function with auto-detection of tsc, eslint, biome, and test suites
  - commitFixToGitHub function using Octokit Contents API with SHA retrieval
  - generateFixWithAgent fallback using ToolLoopAgent with gateway model
affects: [03-auto-fix-commit-loop]

# Tech tracking
tech-stack:
  added: []
  patterns: [tiered fix approach (fast-path + agent fallback), validation tool auto-detection, Octokit Contents API commit pattern, fuzzy line-by-line string matching]

key-files:
  created:
    - lib/fix/types.ts
    - lib/fix/apply.ts
    - lib/fix/validate.ts
    - lib/fix/commit.ts
    - lib/fix/agent.ts
    - tests/fix/apply.test.ts
    - tests/fix/validate.test.ts
    - tests/fix/commit.test.ts
  modified: []

key-decisions:
  - "Fuzzy line-by-line matching with trim() as fallback when exact fix.before match fails due to indentation differences"
  - "Independent try/catch per validation tool so one failure does not block others from running"
  - "ToolLoopAgent with stepCountIs(15) stop condition for bounded agent fix generation"

patterns-established:
  - "Tiered fix: fast-path stored fix.after -> agent fallback with ToolLoopAgent"
  - "Validation auto-detection: check config file existence in sandbox to determine which tools to run"
  - "Octokit Contents API: always fetch SHA fresh before commit (never cache)"
  - "Source code analysis tests: readFileSync pattern for verifying module structure without SDK initialization"

requirements-completed: [FIX-01, FIX-02, FIX-03]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 03 Plan 01: Fix Pipeline Core Modules Summary

**Tiered fix pipeline with fast-path stored fix application, multi-tool validation auto-detection, Octokit Contents API commit, and ToolLoopAgent fallback**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T23:46:16Z
- **Completed:** 2026-03-27T23:48:52Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Built 5 production modules in lib/fix/ covering the complete fix pipeline: types, apply, validate, commit, agent
- Implemented whitespace-tolerant fix application with fuzzy line-by-line matching for indentation differences
- Auto-detection of validation tools (tsc, eslint, biome, test suite) with independent try/catch per tool
- Octokit Contents API commit with SHA retrieval, descriptive commit messages, and ClawGuard Bot committer
- ToolLoopAgent fallback fix generation with 15-step limit and structured output schema
- 34 passing tests across 3 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create fix types, apply, and validate modules** - `4e4cc51` (feat)
2. **Task 2: Create commit module, agent module, and tests** - `dd3b585` (feat)

## Files Created/Modified
- `lib/fix/types.ts` - FixResult, FixContext, ValidationResult, ApplyResult interfaces
- `lib/fix/apply.ts` - applyStoredFix with whitespace normalization and fuzzy matching
- `lib/fix/validate.ts` - runValidation with auto-detection of tsc, eslint, biome, test suite
- `lib/fix/commit.ts` - commitFixToGitHub via Octokit Contents API with SHA retrieval
- `lib/fix/agent.ts` - generateFixWithAgent using ToolLoopAgent with gateway model
- `tests/fix/apply.test.ts` - 11 tests for fix application module
- `tests/fix/validate.test.ts` - 11 tests for validation module
- `tests/fix/commit.test.ts` - 12 tests for commit module

## Decisions Made
- Fuzzy line-by-line matching with trim() as fallback when exact fix.before match fails due to indentation differences
- Independent try/catch per validation tool so one failure does not block others from running
- ToolLoopAgent with stepCountIs(15) stop condition for bounded agent fix generation
- ClawGuard Bot committer identity for auto-fix commits

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 core fix pipeline modules are ready for Plan 03's orchestrator (fixFinding/fixAll) to compose
- applyStoredFix -> runValidation -> commitFixToGitHub pipeline is complete
- generateFixWithAgent fallback ready for when stored fixes fail validation
- Ready for Plan 02 (already completed) and Plan 03 (fix orchestrator + bot integration)

## Self-Check: PASSED

- All 8 created files exist on disk
- Both task commits (4e4cc51, dd3b585) found in git log
- SUMMARY.md exists at expected path

---
*Phase: 03-auto-fix-commit-loop*
*Completed: 2026-03-28*
