# Phase 4: Interactive Web Report - Context

**Gathered:** 2026-03-28 (updated)
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a rich, interactive security report page at `/report/[owner]/[repo]/[pr]` that reads stored audit JSON from Upstash Redis and renders with a professional dark-theme enterprise aesthetic. The report is publicly shareable without authentication. It displays security scores, OWASP distribution, expandable finding cards with Mermaid diagrams and code diffs, a threat model tab, and a compliance mapping tab. v0 SDK is used at dev-time for component generation (optional, with manual fallback).

Requirements: REPT-01, REPT-02, REPT-03, REPT-04, REPT-05, REPT-06, REPT-07, REPT-08, REPT-09, REPT-10, REPT-11, REPT-12, REPT-13, REPT-14

</domain>

<decisions>
## Implementation Decisions

### Report Layout & Navigation
- **D-01:** Tabbed sections — Findings tab (default), Threat Model tab, Compliance tab. Score header with gauge and charts persists above tabs.
- **D-02:** Dense hero header above tabs showing: semicircle score gauge, OWASP distribution chart, and inline severity pill badges. Maximum visual impact on first load.
- **D-03:** High information density throughout — tight spacing, smaller text, lots of data visible at once. Enterprise-grade feel like Datadog or Grafana, not airy SaaS.
- **D-04:** Theme follows system preference via `prefers-color-scheme` (light + dark). No manual toggle needed.

### Score Gauge & Charts
- **D-05:** Semicircle gauge for security score — half-circle arc with score number (e.g., "72/100") in center, grade letter below. Color gradient from red (0) to green (100). Built with Recharts RadialBarChart.
- **D-06:** OWASP Top 10 distribution as horizontal bar chart — categories on Y-axis, finding counts as horizontal bars, bars color-coded by highest severity in that category. Recharts BarChart.
- **D-07:** Inline pill badges for severity counts next to the score gauge (CRITICAL: N | HIGH: N | MEDIUM: N | LOW: N). Color-coded by severity.

### Finding Card Design & Interaction
- **D-08:** Accordion-style expandable finding cards. Collapsed: severity badge, vulnerability type, file:line location, CWE/OWASP tags. Expanded: full description, attack scenario callout, Mermaid data flow diagram, side-by-side code diff, compliance badges.
- **D-09:** Mermaid data flow diagrams rendered inline client-side inside each expanded finding card. Mermaid library lazy-loaded on first card expand to manage bundle size. `'use client'` + dynamic import required (browser-only).
- **D-10:** Side-by-side before/after code diffs using react-diff-viewer-continued with shiki syntax highlighting. Professional code review tool look.
- **D-11:** Findings sorted by severity (CRITICAL first, then HIGH, MEDIUM, LOW, INFO). Fixed sort order, no user filter controls needed.

### shadcn/ui Foundation
- **D-12:** Initialize shadcn/ui with **New York style**, **zinc** base color palette. Neutral grey backgrounds pair well with colored severity badges (red/orange/yellow/green).
- **D-13:** shadcn/ui CSS variable system must be added to `globals.css` (currently bare Tailwind v4). This is the first task before any component work.

### v0 SDK Workflow
- **D-14:** v0 SDK is **optional** — used as a time-saver, not a dependency. If generation produces poor output or the API is unavailable, fall back to hand-building with shadcn/ui + Recharts directly. No blockers on v0.
- **D-15:** v0 runs as the **first task** in the build process. If output is good, customize in later tasks. If not, subsequent tasks build components from scratch.
- **D-16:** **Component-by-component** v0 generation — generate individual components (gauge, finding card, compliance table) as separate v0 prompts for better control, rather than one full-page generation.
- **D-17:** Template init approach — use `v0.chats.init({ type: 'files' })` with template baseline (globals.css, theme variables, shared components), then `v0.chats.create()` per component.

### Empty & Error States
- **D-18:** **Branded 404 page** when a report URL points to a PR that hasn't been audited. "Report not found — this PR hasn't been audited yet." with ClawGuard branding.
- **D-19:** **Skeleton + auto-refresh** when audit status is `processing`. Full skeleton screen with animated placeholders for gauge, chart, and card sections. Client component polls every 3-5 seconds and reloads when complete.
- **D-20:** **Generic error + re-run hint** when audit status is `error`. "This audit encountered an error. Please re-run by @mentioning ClawGuard." No internal diagnostics exposed.

### Data Loading Strategy
- **D-21:** **Server component** fetches audit data from Redis at request time. Fast first paint, SEO-friendly, simple.
- **D-22:** **Client polling on processing page** — a small client component on the processing skeleton page polls a dedicated API route every 3-5 seconds and triggers a full page reload when status changes to `complete`.
- **D-23:** **Dedicated API route** at `/api/report/[owner]/[repo]/[pr]/route.ts` returns audit JSON. Used by client polling and potentially by external consumers.

### Claude's Discretion
- Exact shadcn/ui component selection and composition
- Mermaid diagram styling and theme configuration for dark mode
- Threat Model tab internal layout (attack surface entries, attack path diagrams, risk assessment display)
- Compliance tab table structure and formatting
- Loading skeleton component design
- v0 prompt engineering for optimal generation results
- Exact color palette for severity levels and score gradient
- Next.js revalidation/caching strategy for the server component
- Polling interval fine-tuning (3-5 second range)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Report Requirements
- `.planning/REQUIREMENTS.md` §Interactive Web Report — REPT-01 through REPT-14 (report URL, header, gauge, charts, cards, diagrams, diffs, tabs, compliance, theme, sharing, v0 SDK)

### Audit Data Schema
- `lib/analysis/types.ts` — `AuditResult`, `Finding`, `PhaseResult` Zod schemas. Finding includes: severity, type, location, cweId, owaspCategory, description, attackScenario, confidence, dataFlow, fix, complianceMapping
- `lib/redis.ts` — `AuditData` interface (result, timestamp, pr metadata, status), `getAuditResult()` helper
- `lib/analysis/scoring.ts` — `calculateScore()`, `countBySeverity()`, `DEDUCTIONS`, `GRADE_THRESHOLDS` exports

### Stack & Dependencies
- `.planning/research/STACK.md` — Verified package versions, Tailwind v4 CSS config, Mermaid browser-only gotcha, v0 SDK paid plan requirement
- `CLAUDE.md` §Technology Stack — Full dependency table with versions, compatibility notes, alternatives considered

### Prior Phase Patterns
- `.planning/phases/01-foundation-bot-wiring/01-CONTEXT.md` — Redis key format (D-06: `{owner}/{repo}/pr/{number}`), error handling (D-07: generic messages)
- `.planning/phases/02-security-analysis-pipeline/02-CONTEXT.md` — Card design reference (D-01 through D-05), live progress UX, finding confidence indicator

### v0 SDK
- v0 Platform API docs: `https://v0.app/docs/api/platform/overview` — init and create APIs

### UI Libraries
- Recharts docs: chart types, dark theme support, RadialBarChart for gauge
- Mermaid docs: flowchart syntax, dark theme configuration, dynamic import pattern
- shiki docs: server-side syntax highlighting, theme support
- react-diff-viewer-continued docs: side-by-side and unified diff views

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/analysis/types.ts` — Full `Finding` and `AuditResult` Zod schemas with all fields the report needs (severity, CWE, OWASP, dataFlow, fix, complianceMapping)
- `lib/redis.ts` — `getAuditResult(key)` fetches complete audit data by key pattern `{owner}/{repo}/pr/{number}`
- `lib/analysis/scoring.ts` — `calculateScore()`, `countBySeverity()`, `DEDUCTIONS`, `GRADE_THRESHOLDS` — score calculation logic reusable for display
- `app/globals.css` — Tailwind v4 CSS setup with `prefers-color-scheme` dark mode pattern (needs shadcn CSS variables added)
- `app/layout.tsx` — Root layout with Geist/Geist_Mono fonts, metadata configured

### Established Patterns
- Tailwind v4 CSS: `@import "tailwindcss"` with `@theme inline` for custom properties
- Path alias `@/*` maps to repo root
- Named exports, no barrel files, direct imports
- Next.js App Router file-based routing

### Integration Points
- `app/report/[owner]/[repo]/[pr]/page.tsx` — New dynamic route (to be created)
- `app/api/report/[owner]/[repo]/[pr]/route.ts` — New API route for client polling (to be created)
- `getAuditResult()` from `lib/redis.ts` — Server-side data fetch in page component
- `globals.css` — Needs shadcn/ui CSS variable system added (currently bare Tailwind v4)
- No `components.json` yet — shadcn/ui needs initialization before component installation

</code_context>

<specifics>
## Specific Ideas

- The report is the visual wow factor for the hackathon cybersecurity judge — it needs to look enterprise-grade, not like a toy
- Dense hero header with the semicircle gauge is the "screenshot moment" — what gets shared and makes people want to try the tool
- Mermaid data flow diagrams per finding (source -> transform -> sink) visually show how tainted data flows, which is more impactful than just text descriptions
- Side-by-side code diffs match what developers expect from code review tools (GitHub, GitLab)
- v0 SDK component-by-component generation gives finer control than full-page generation; manual fallback ensures no blockers
- Skeleton + auto-refresh for processing state means the report URL is immediately shareable even before analysis completes — good for demo flow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-interactive-web-report*
*Context gathered: 2026-03-28 (updated)*
