---
phase: 5
slug: chat-config-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | CONF-01 | unit | `npx vitest run src/lib/__tests__/config.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | CONF-02 | unit | `npx vitest run src/lib/__tests__/config.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | CONF-03 | unit | `npx vitest run src/lib/__tests__/config.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | CHAT-01 | unit | `npx vitest run src/lib/__tests__/chat.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | CHAT-02 | unit | `npx vitest run src/lib/__tests__/chat.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | DASH-01 | unit | `npx vitest run src/app/__tests__/dashboard.test.ts` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | DASH-02 | unit | `npx vitest run src/app/__tests__/dashboard.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/config.test.ts` — stubs for CONF-01, CONF-02, CONF-03, CONF-04, CONF-05
- [ ] `src/lib/__tests__/chat.test.ts` — stubs for CHAT-01, CHAT-02, CHAT-03, CHAT-04
- [ ] `src/app/__tests__/dashboard.test.ts` — stubs for DASH-01, DASH-02, DASH-03, DASH-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub OAuth login flow | DASH-01 | Requires browser + GitHub OAuth callback | 1. Navigate to /dashboard 2. Click "Sign in with GitHub" 3. Authorize 4. Verify redirect to dashboard |
| PR thread follow-up | CHAT-01 | Requires GitHub webhook + PR comment | 1. Comment @clawguard on PR 2. Wait for audit 3. Reply with follow-up question 4. Verify contextual response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
