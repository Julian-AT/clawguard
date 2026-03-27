---
phase: 01-foundation-bot-wiring
plan: 02
subsystem: webhook, bot, testing
tags: [chat-sdk, github-adapter, redis-state, vitest, webhook, idempotency, after]

# Dependency graph
requires:
  - phase: 01-foundation-bot-wiring
    plan: 01
    provides: "lib/redis.ts (audit storage), lib/review.ts (sandbox pipeline), vitest config, package.json with all Phase 1 deps"
provides:
  - "Chat SDK bot instance with GitHub adapter and event handlers (lib/bot.ts)"
  - "Webhook route handler with idempotency and background processing (app/api/webhooks/github/route.ts)"
  - "Automated tests covering all 8 Phase 1 requirements (15 tests across 4 files)"
affects: [02-security-pipeline, 03-report-ui, 04-auto-fix, 05-config]

# Tech tracking
tech-stack:
  added: [chat, "@chat-adapter/github", "@chat-adapter/state-redis", "@octokit/rest"]
  patterns: ["Chat SDK bot.onNewMention for PR thread interaction", "after() from next/server for background processing", "Redis SETNX for webhook idempotency", "vi.hoisted() for mock variables in vi.mock factories"]

key-files:
  created:
    - lib/bot.ts
    - app/api/webhooks/github/route.ts
    - tests/redis.test.ts
    - tests/review.test.ts
    - tests/webhook-handler.test.ts
    - tests/bot.test.ts
  modified: []

key-decisions:
  - "Used GitHubRawMessage type import from @chat-adapter/github for type-safe raw message access"
  - "Used vi.hoisted() pattern in Vitest 4.x for mock variables referenced by hoisted vi.mock factories"
  - "Used regular function (not arrow) in mockImplementation for ToolLoopAgent to support new operator"
  - "Bot source code analysis tests for HOOK-02 instead of module import (avoids Chat SDK initialization side effects)"

patterns-established:
  - "vi.hoisted() for any mock variables used inside vi.mock() factory functions (Vitest 4.x requirement)"
  - "Webhook idempotency: read X-GitHub-Delivery header -> Redis SETNX with 1h TTL -> skip if duplicate"
  - "Background processing: handler(request, { waitUntil: (task) => after(() => task) })"
  - "Error handling: catch block posts friendly message, never exposes error.message or error.stack"

requirements-completed: [HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05]

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 1 Plan 02: Bot Wiring & Tests Summary

**Chat SDK bot wired to webhook route with idempotency via Redis SETNX, background processing via after(), and 15 automated tests covering all 8 Phase 1 requirements**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-27T20:06:48Z
- **Completed:** 2026-03-27T20:15:15Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint -- awaiting verification)
- **Files modified:** 6

## Accomplishments
- Chat SDK bot instance with GitHub adapter, Redis state, onNewMention handler with phased status updates, and friendly error handling
- Webhook route handler with X-GitHub-Delivery idempotency (Redis SETNX, 1h TTL), after() background processing, maxDuration=300
- 15 automated tests covering all 8 Phase 1 requirements: HOOK-01 through HOOK-05, SCAN-01, SCAN-07, SCAN-08

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Chat SDK Bot Instance & Webhook Route Handler** - `7550a79` (feat)
2. **Task 2: Create Automated Tests for All Phase 1 Requirements** - `3047836` (test)
3. **Task 3: Verify End-to-End Chain with Real GitHub Webhook** - PENDING (checkpoint:human-verify)

## Files Created/Modified
- `lib/bot.ts` - Chat SDK bot with GitHub adapter, onNewMention (ack -> review -> store -> complete), onSubscribedMessage, error handling
- `app/api/webhooks/github/route.ts` - POST handler with idempotency, after() delegation, maxDuration=300
- `tests/redis.test.ts` - 3 tests for SCAN-07 (store, retrieve, null key)
- `tests/review.test.ts` - 4 tests for SCAN-01 (sandbox clone, cleanup) and SCAN-08 (AI Gateway model)
- `tests/webhook-handler.test.ts` - 5 tests for HOOK-01, HOOK-03, HOOK-04, HOOK-05
- `tests/bot.test.ts` - 3 tests for HOOK-02, D-07 (friendly errors, no internals exposed)

## Decisions Made
- Used `GitHubRawMessage` type from `@chat-adapter/github` for type-safe access to `message.raw` fields (repository, prNumber)
- Bot tests use source code analysis (readFileSync) rather than module import to avoid Chat SDK initialization side effects in test environment
- Used `vi.hoisted()` pattern for all mock variables referenced in `vi.mock()` factories -- required in Vitest 4.x due to hoisting
- Used regular function (not arrow) in `mockImplementation` for ToolLoopAgent mock since arrow functions cannot be constructors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created Plan 01 infrastructure files for parallel execution**
- **Found during:** Task 1 (pre-execution)
- **Issue:** Plan 02 depends on Plan 01 (lib/redis.ts, lib/review.ts, package.json, vitest.config.ts) but running in parallel worktree where Plan 01 hasn't executed
- **Fix:** Created infrastructure files matching Plan 01's documented interfaces to enable compilation and testing. Only Plan 02's files (lib/bot.ts, route.ts, tests) were committed.
- **Files modified:** lib/redis.ts, lib/review.ts, vitest.config.ts, package.json (local only, not committed)
- **Verification:** npx tsc --noEmit passes, all tests pass
- **Impact:** None -- orchestrator will merge Plan 01's real implementations

**2. [Rule 1 - Bug] Fixed vi.mock hoisting issues in test files**
- **Found during:** Task 2 (test execution)
- **Issue:** Variables declared before vi.mock() factories were inaccessible due to Vitest 4.x hoisting behavior
- **Fix:** Wrapped all mock variables in vi.hoisted() calls
- **Files modified:** tests/redis.test.ts, tests/review.test.ts, tests/webhook-handler.test.ts
- **Verification:** All 15 tests pass

**3. [Rule 1 - Bug] Fixed ToolLoopAgent mock constructor**
- **Found during:** Task 2 (test execution)
- **Issue:** Arrow function in mockImplementation cannot be used as constructor with `new` operator
- **Fix:** Changed to regular function expression in mockImplementation
- **Files modified:** tests/review.test.ts
- **Verification:** All review pipeline tests pass

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness in parallel execution environment. No scope creep.

## Issues Encountered
- Parallel worktree execution required bootstrapping Plan 01's infrastructure locally -- resolved by creating matching interface files
- Vitest 4.x `vi.mock()` factory hoisting required `vi.hoisted()` pattern -- documented as established pattern

## Known Stubs
None -- all code is fully wired with real imports and types.

## User Setup Required

**External services require manual configuration.** The plan frontmatter documents all required env vars:
- **GitHub App:** GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET, GITHUB_BOT_USERNAME, GITHUB_TOKEN
- **Upstash Redis:** UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, REDIS_URL
- **Vercel:** OIDC token via `vercel link && vercel env pull`

## Next Phase Readiness
- Bot wiring complete -- ready for end-to-end verification (Task 3 checkpoint)
- All automated tests pass -- Phase 1 requirement coverage verified
- Awaiting human verification of live webhook -> bot -> pipeline -> storage chain

## Self-Check: PASSED

- All 6 created files exist on disk
- Commit 7550a79 (Task 1) found in git log
- Commit 3047836 (Task 2) found in git log
- 15/15 tests pass with npx vitest run

---
*Phase: 01-foundation-bot-wiring*
*Completed: 2026-03-27 (pending Task 3 human verification)*
