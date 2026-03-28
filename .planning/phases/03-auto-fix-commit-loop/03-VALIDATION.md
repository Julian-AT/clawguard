---
phase: 3
slug: auto-fix-commit-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (already configured in project) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FIX-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | FIX-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | FIX-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | FIX-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | FIX-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | FIX-06 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | FIX-07 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 2 | CARD-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/fix-agent.test.ts` — stubs for FIX-01, FIX-02, FIX-03 (fix generation, sandbox validation, commit)
- [ ] `__tests__/fix-all.test.ts` — stubs for FIX-04, FIX-05 (batch processing, sequential fix)
- [ ] `__tests__/re-audit.test.ts` — stubs for FIX-06, FIX-07 (re-audit trigger, updated card)
- [ ] `__tests__/action-buttons.test.ts` — stubs for CARD-04 (action buttons in summary card)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub PR comment rendering | CARD-04 | Requires live GitHub rendering | Post summary card to test PR, verify action text commands render correctly |
| Sandbox git clone + npm install | FIX-01 | Requires Vercel Sandbox runtime | Trigger fix on test PR, verify sandbox clones repo and installs deps |
| Commit appears on PR branch | FIX-03 | Requires live GitHub API | Trigger fix, verify commit SHA appears in PR history |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
