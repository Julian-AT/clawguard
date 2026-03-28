---
phase: 04-interactive-web-report
plan: 03
subsystem: report-tabs
tags: [threat-model, compliance, v0-sdk, mermaid, report]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [complete-report-tabs]
  affects: [report-view, threat-model-tab, compliance-tab]
tech_stack:
  added: [v0-sdk, "@v0-sdk/react"]
  patterns: [attack-surface-table, compliance-mapping, v0-dev-time-generation]
key_files:
  created:
    - components/report/attack-surface-table.tsx
    - components/report/threat-model-tab.tsx
    - components/report/compliance-tab.tsx
    - scripts/v0-generate.ts
  modified:
    - components/report/report-view.tsx
    - package.json
decisions:
  - "createClient from v0-sdk (not default v0 export) for configurable API key"
  - "chats.sendMessage after chats.init for template-based component generation workflow"
  - "AttackSurfaceTable sorted by risk severity (CRITICAL first)"
  - "ComplianceTab filters findings to only those with compliance mappings"
metrics:
  duration: 4min
  completed: "2026-03-28T02:59:25Z"
---

# Phase 4 Plan 3: Report Tabs and v0 Integration Summary

Threat Model tab with attack surface table and Mermaid attack path diagrams, Compliance tab with 7-column framework mapping table (PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS), and v0 SDK dev-time script for optional component generation.

## Tasks Completed

### Task 04-03-01: Build Threat Model tab with attack surfaces and attack path diagrams
**Commit:** `cac78e5`

Created two components:
- `AttackSurfaceTable` - renders attack surfaces in a table with Name, Type, Exposure, Risk Level (color-coded badge), and Description columns, sorted by severity
- `ThreatModelTab` - combines the attack surface table with Mermaid attack path diagrams, each showing path name, rendered diagram via `MermaidDiagram`, and risk assessment text

Wired `ThreatModelTab` into `report-view.tsx` replacing the "Threat Model" tab placeholder.

### Task 04-03-02: Build Compliance tab with framework mapping table
**Commit:** `3197489`

Created `ComplianceTab` with 7 columns: Finding (severity badge + type), CWE, PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS. Filters findings to only those with compliance mapping data. Empty mapping arrays render as an em dash in muted color. Rows sorted by severity (CRITICAL first).

Wired `ComplianceTab` into `report-view.tsx` replacing the "Compliance" tab placeholder.

### Task 04-03-03: v0 SDK dev-time integration
**Commit:** `67d34c0`

Installed `v0-sdk` and `@v0-sdk/react`. Created `scripts/v0-generate.ts` that uses `createClient` and `chats.init` + `chats.sendMessage` workflow for template-based component generation. Script exits gracefully with informational message when `V0_API_KEY` is not set. Added `v0:generate` npm script.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed v0 SDK API usage**
- **Found during:** Task 3
- **Issue:** Plan used `v0({ apiKey })` syntax but v0-sdk exports `createClient` function, not a callable `v0`. Also `chats.init` takes array of file objects (not record), and `chats.create` does not accept `chatId` (use `chats.sendMessage` instead).
- **Fix:** Used `createClient({ apiKey })`, array-format files, and `chats.sendMessage({ chatId, message })`.
- **Files modified:** `scripts/v0-generate.ts`
- **Commit:** `67d34c0`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `createClient` over `v0` export | v0-sdk types show `v0` is a pre-constructed object, `createClient` accepts config with API key |
| `chats.sendMessage` after `chats.init` | Correct two-step workflow: init creates chat with template files, sendMessage generates component |
| Severity-sorted tables | Both AttackSurfaceTable and ComplianceTab sort by severity (CRITICAL first) for consistent enterprise UX |
| ComplianceTab filters findings without mappings | Cleaner table -- only shows rows with actual compliance data |

## Verification

- TypeScript: No errors in new components (pre-existing errors from uninstalled type declarations are out of scope)
- All 3 report tabs (Findings, Threat Model, Compliance) render content from AuditResult data
- v0-sdk and @v0-sdk/react are in package.json dependencies
- scripts/v0-generate.ts exists with `createClient` import from v0-sdk
- package.json contains `v0:generate` script

## Known Stubs

None -- all three tabs render real data from AuditResult. ThreatModelTab uses threatModel data for attack surfaces and paths. ComplianceTab uses findings complianceMapping data. The v0 script is intentionally optional (dev-time only, not runtime).

## Self-Check: PASSED

All 5 files verified present. All 3 commit hashes verified in git log.
