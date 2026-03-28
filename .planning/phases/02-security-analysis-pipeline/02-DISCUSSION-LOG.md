# Phase 2: Security Analysis Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 02-security-analysis-pipeline
**Areas discussed:** Summary card design, Analysis depth vs speed, Finding quality bar, Score transparency

---

## Summary Card Design

### Card Layout Style

| Option | Description | Selected |
|--------|-------------|----------|
| Score-first with findings table | Big score + grade at top, severity badges, markdown table with top 3-5 findings, View Report link | ✓ |
| Compact summary | Single-paragraph with inline badges and link. Minimal footprint. | |
| Expandable details | Score + severity badges + `<details>` blocks for each finding | |

**User's choice:** Score-first with findings table
**Notes:** Dense, professional look preferred for hackathon demo.

### Number of Findings in Card

| Option | Description | Selected |
|--------|-------------|----------|
| Top 3 findings | Tight card, forces report click-through | |
| Top 5 findings | More info, still manageable for PR comment | ✓ |
| All findings | Full transparency, everything in card | |

**User's choice:** Top 5 findings

### Card Branding

| Option | Description | Selected |
|--------|-------------|----------|
| ClawGuard branded header | "ClawGuard Security Audit" with shield claw emoji, consistent branding | ✓ |
| Generic header | "Security Audit Results" — neutral | |
| You decide | Let Claude choose | |

**User's choice:** ClawGuard branded header

---

## Analysis Depth vs Speed

### Analysis Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Full 3-phase sequential | Three separate ToolLoopAgent calls, each feeding context to next. ~2-4 min. Richest findings. | ✓ |
| Combined single pass | Single agent call covering all 3 phases. ~1-2 min. Less structured. | |
| Parallel 3-phase | All 3 phases run simultaneously. ~60-90s. No cumulative context. | |

**User's choice:** Full 3-phase sequential
**Notes:** Quality of findings for demo report outweighs speed concerns.

### Progress UX

| Option | Description | Selected |
|--------|-------------|----------|
| Live phase progress | Edit PR comment in real-time as each phase completes. Checkmarks + spinner. | ✓ |
| Silent then final card | Post ack, process silently, post final card. | |
| You decide | Let Claude decide based on Chat SDK API | |

**User's choice:** Live phase progress
**Notes:** Critical for demo audience engagement during the 2-4 minute wait.

---

## Finding Quality Bar

### Severity Levels in Card vs Data

| Option | Description | Selected |
|--------|-------------|----------|
| Medium+ in card, all in data | Card shows CRITICAL/HIGH/MEDIUM only. All severities in stored JSON and report. | ✓ |
| All severities everywhere | Everything at every level, card shows top 5 from all. | |
| Critical + High only in card | Maximum signal, zero noise. Most dramatic for demo. | |

**User's choice:** Medium+ in card, all in data
**Notes:** Card is the "hook" — keep punchy. Full data preserved for report.

### Confidence Indicators

| Option | Description | Selected |
|--------|-------------|----------|
| Show confidence per finding | High/medium/low confidence indicator. Acknowledges LLM uncertainty. | ✓ |
| No confidence shown | Present all findings as facts. Simpler, more authoritative. | |
| You decide | Let Claude decide based on demo impact | |

**User's choice:** Show confidence per finding
**Notes:** Adds credibility with security-professional judges.

---

## Score Transparency

### Score Detail in Card

| Option | Description | Selected |
|--------|-------------|----------|
| Score + badges in card, breakdown in report | Score/grade + severity badge counts. Deduction math in report page. | ✓ |
| Score + deduction summary in card | Score + one-line deduction formula. More transparent but noisier. | |
| Score only, no breakdown | Ultra-minimal. Maximizes curiosity. | |

**User's choice:** Score + badges in card, breakdown in report

### Score Calculation Method

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed deduction formula | CRITICAL=-25, HIGH=-15, MEDIUM=-8, LOW=-3, INFO=-1. Deterministic. | ✓ |
| AI-assessed score | Let AI determine based on overall risk. More nuanced, less predictable. | |
| Formula + threat model adjustment | Fixed formula + AI threat model ±10 adjustment. Best of both. | |

**User's choice:** Fixed deduction formula
**Notes:** Deterministic and easy to explain to judges.

---

## Claude's Discretion

- Exact agent system prompts and prompt engineering
- Zod schema structure for findings
- Context flow between sequential phases
- GFM markdown formatting for badges
- Error handling within individual phases
- AuditData schema evolution

## Deferred Ideas

None — discussion stayed within phase scope
