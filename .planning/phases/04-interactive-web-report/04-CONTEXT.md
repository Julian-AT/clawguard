# Phase 4: Interactive Web Report - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a rich, interactive security report page at `/report/[owner]/[repo]/[pr]` that reads stored audit JSON from Upstash Redis and renders with a professional dark-theme enterprise aesthetic. The report is publicly shareable without authentication. It displays security scores, OWASP distribution, expandable finding cards with Mermaid diagrams and code diffs, a threat model tab, and a compliance mapping tab. v0 SDK is used at dev-time for component generation.

Requirements: REPT-01, REPT-02, REPT-03, REPT-04, REPT-05, REPT-06, REPT-07, REPT-08, REPT-09, REPT-10, REPT-11, REPT-12, REPT-13, REPT-14

</domain>

<decisions>
## Implementation Decisions

### Report Layout & Navigation
- **D-01:** Tabbed sections — Findings tab (default), Threat Model tab, Compliance tab. Score header with gauge and charts persists above tabs.
- **D-02:** Dense hero header above tabs showing: semicircle score gauge, OWASP distribution chart, and inline severity pill badges. Maximum visual impact on first load.
- **D-03:** High information density throughout — tight spacing, smaller text, lots of data visible at once. Enterprise-grade feel like Datadog or Grafana, not airy SaaS.
- **D-04:** Theme follows system preference via `prefers-color-scheme` (current globals.css pattern). No manual toggle needed.

### Score Gauge & Charts
- **D-05:** Semicircle gauge for security score — half-circle arc with score number (e.g., "72/100") in center, grade letter below. Color gradient from red (0) to green (100). Built with Recharts RadialBarChart.
- **D-06:** OWASP Top 10 distribution as horizontal bar chart — categories on Y-axis, finding counts as horizontal bars, bars color-coded by highest severity in that category. Recharts BarChart.
- **D-07:** Inline pill badges for severity counts next to the score gauge (CRITICAL: N | HIGH: N | MEDIUM: N | LOW: N). Color-coded by severity.

### Finding Card Design & Interaction
- **D-08:** Accordion-style expandable finding cards. Collapsed: severity badge, vulnerability type, file:line location, CWE/OWASP tags. Expanded: full description, attack scenario callout, Mermaid data flow diagram, side-by-side code diff, compliance badges.
- **D-09:** Mermaid data flow diagrams rendered inline client-side inside each expanded finding card. Mermaid library lazy-loaded on first card expand to manage bundle size. `'use client'` + dynamic import required (browser-only).
- **D-10:** Side-by-side before/after code diffs using react-diff-viewer-continued with shiki syntax highlighting. Professional code review tool look.
- **D-11:** Findings sorted by severity (CRITICAL first, then HIGH, MEDIUM, LOW, INFO). Fixed sort order, no user filter controls needed.

### v0 SDK Workflow
- **D-12:** Full page generation — use v0 to generate a complete report page template with all components (gauge, charts, cards, tabs, compliance table), then customize/polish the output.
- **D-13:** Generate-then-customize workflow — run v0 generation during phase execution as a build step. v0 output is the starting point, not the final product. Review and customize in subsequent tasks.
- **D-14:** Template init approach — use `v0.chats.init({ type: 'files' })` with template baseline (globals.css, theme variables, shared components), then `v0.chats.create()` with a security report design prompt.

### Claude's Discretion
- Exact shadcn/ui component selection and composition
- Mermaid diagram styling and theme configuration for dark mode
- Threat Model tab internal layout (attack surface entries, attack path diagrams, risk assessment display)
- Compliance tab table structure and formatting
- Loading states and error states for the report page
- v0 prompt engineering for optimal generation results
- How to handle missing or incomplete audit data gracefully
- Exact color palette for severity levels and score gradient

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Report Requirements
- `.planning/REQUIREMENTS.md` §Interactive Web Report — REPT-01 through REPT-14 (report URL, header, gauge, charts, cards, diagrams, diffs, tabs, compliance, theme, sharing, v0 SDK)

### Audit Data Schema
- `lib/analysis/types.ts` — `AuditResult`, `Finding`, `PhaseResult` Zod schemas. Finding includes: severity, type, location, cweId, owaspCategory, description, attackScenario, confidence, dataFlow, fix, complianceMapping
- `lib/redis.ts` — `AuditData` interface (result, timestamp, pr metadata, status), `getAuditResult()` helper

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
- `lib/analysis/scoring.ts` — Score calculation logic (deductions by severity, grade mapping)
- `app/globals.css` — Tailwind v4 CSS setup with `prefers-color-scheme` dark mode pattern
- `app/layout.tsx` — Root layout with Geist/Geist_Mono fonts, metadata configured

### Established Patterns
- Tailwind v4 CSS: `@import "tailwindcss"` with `@theme inline` for custom properties
- Path alias `@/*` maps to repo root
- Named exports, no barrel files, direct imports
- Next.js App Router file-based routing

### Integration Points
- `app/report/[owner]/[repo]/[pr]/page.tsx` — New dynamic route (to be created)
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
- v0 SDK full page generation gives us a fast starting point; customization pass makes it polished

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-interactive-web-report*
*Context gathered: 2026-03-28*
