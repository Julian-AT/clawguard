---
phase: 1
slug: foundation-bot-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | HOOK-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | HOOK-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | 01 | 1 | HOOK-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | SCAN-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | SCAN-07 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/react` — install test framework
- [ ] `vitest.config.ts` — test configuration
- [ ] `tests/` directory — test file structure

*Task IDs will be populated after plans are created.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub webhook delivery triggers bot | HOOK-01 | Requires live GitHub webhook | @mention @clawguard on a PR, verify webhook received |
| Bot posts acknowledgment to PR thread | HOOK-02 | Requires GitHub API interaction | Check PR thread for bot response after @mention |
| Sandbox clones repo and checks out PR branch | SCAN-01 | Requires Vercel Sandbox + real repo | Trigger audit, verify sandbox logs show successful clone |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
