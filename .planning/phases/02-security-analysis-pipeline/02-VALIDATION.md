---
phase: 02
slug: security-analysis-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | SCAN-02 | unit | TBD | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCAN-03 | unit | TBD | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCAN-04 | unit | TBD | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCAN-05 | unit | TBD | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCAN-06 | unit | TBD | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CARD-01 | unit | TBD | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CARD-02 | unit | TBD | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CARD-03 | unit | TBD | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` — install test framework if not present
- [ ] `__tests__/` — test directory structure
- [ ] Test stubs for all SCAN and CARD requirements

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Summary card renders correctly on GitHub PR | CARD-01 | GitHub GFM rendering is browser-only | Post to test PR, visually inspect card |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
