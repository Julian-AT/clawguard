# Phase 4: Interactive Web Report - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 04-interactive-web-report
**Areas discussed:** Report layout & navigation, Score gauge & chart presentation, Finding card design & interaction, v0 SDK workflow & scope, v0 SDK risk mitigation, shadcn/ui foundation, Empty & error states, Data loading strategy

---

## Report Layout & Navigation (initial session)

### Page Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Tabbed sections | Findings tab default. Threat Model and Compliance as separate tabs. Keeps page focused. | ✓ |
| Single scroll with sidebar nav | Everything on one page with sticky nav sidebar. Good for printing, bad for long reports. | |
| Tabs + sidebar index | Tabs plus left sidebar with findings list for quick jump-to. Most complex. | |

**User's choice:** Tabbed sections

### Header Density

| Option | Description | Selected |
|--------|-------------|----------|
| Dense hero header | Score gauge + OWASP chart + severity badges all in header. Maximum visual impact. | ✓ |
| Compact header, chart in tab | Just score + badges in header, OWASP chart inside Findings tab. | |
| You decide | Let Claude decide best balance. | |

**User's choice:** Dense hero header

### Information Density

| Option | Description | Selected |
|--------|-------------|----------|
| High density | Tight spacing, smaller text, lots of data. Like Datadog/Grafana. Enterprise-grade. | ✓ |
| Medium density | Generous whitespace, larger cards, modern SaaS feel. Like Linear/Vercel. | |
| You decide | Let Claude pick based on content volume and dark theme readability. | |

**User's choice:** High density

### Dark Theme Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Dark only | Always dark, no toggle. Simpler, stronger brand identity. | |
| Dark default, light toggle | Default dark with a toggle in header. More accessible. | |
| System preference | Follow OS preference via prefers-color-scheme. Current globals.css already has this. | ✓ |

**User's choice:** System preference

---

## Score Gauge & Chart Presentation (initial session)

### Score Gauge Style

| Option | Description | Selected |
|--------|-------------|----------|
| Semicircle gauge | Half-circle arc with score in center, grade below. Color gradient. Recharts RadialBarChart. | ✓ |
| Circular ring | Full 360° ring with score in center. More compact. | |
| Number + badge | Large number with grade badge. No chart, pure CSS. Fastest to build. | |

**User's choice:** Semicircle gauge

### OWASP Chart Style

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal bar chart | Categories on Y-axis, counts as horizontal bars. Color-coded by severity. Standard for security reports. | ✓ |
| Radar chart | Spider chart with OWASP categories as axes. More visual but harder to read values. | |
| You decide | Let Claude pick. | |

**User's choice:** Horizontal bar chart

### Severity Badges

| Option | Description | Selected |
|--------|-------------|----------|
| Inline pill badges | Colored pill badges next to score gauge. Inline, compact. | ✓ |
| Stacked severity cards | Small stacked cards showing severity count with icon. More vertical space. | |
| You decide | Let Claude pick. | |

**User's choice:** Inline pill badges

---

## Finding Card Design & Interaction (initial session)

### Card Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Accordion expand | Cards expand in-place. Collapsed: severity, type, file:line, CWE. Expanded: full details + diagrams + diffs. | ✓ |
| Click to open detail panel | Click opens side-panel overlay with all details. Keeps context. More complex. | |
| Fully expanded | All details visible always. Long page, no interaction. Simplest. | |

**User's choice:** Accordion expand

### Mermaid Diagrams

| Option | Description | Selected |
|--------|-------------|----------|
| Inline Mermaid in card | Render client-side inside expanded cards. Lazy-load mermaid library on first expand. | ✓ |
| Text-based data flow | Simplified text flow (no Mermaid). No dependency. Less visual impact. | |
| You decide | Let Claude decide based on bundle size trade-offs. | |

**User's choice:** Inline Mermaid in card

### Code Diff Style

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side diff | Side-by-side before/after panes. react-diff-viewer-continued + shiki. Professional look. | ✓ |
| Unified diff | Like git diff with red/green lines. More compact. Same libraries. | |
| You decide | Let Claude pick best for dark theme and card width. | |

**User's choice:** Side-by-side diff

### Sort/Filter

| Option | Description | Selected |
|--------|-------------|----------|
| Severity sort only | Fixed sort: CRITICAL first, then HIGH, MEDIUM, LOW, INFO. No user controls. | ✓ |
| Severity sort + filter toggles | Sort by severity plus filter toggles to show/hide by severity level. | |
| You decide | Let Claude decide based on likely finding count. | |

**User's choice:** Severity sort only

---

## v0 SDK Workflow & Scope (initial session)

### Generation Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full page generation | Use v0 to generate complete report page template with all components. Maximum v0 leverage. | |
| Cherry-pick components only | Hand-build page structure, v0 for complex individual components only. More control. | |
| Skip v0, build manually | Build everything with shadcn/ui + Recharts manually. Simplest workflow. | |
| You decide | Let Claude decide the right balance. | |

**User's choice:** Full page generation (initial) — **Revised to Component-by-component** in update session

### Workflow Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Generate then customize | Run v0 during execution as build step. Output is starting point, then customize. | ✓ |
| Pre-generate, then build on top | Generate first as separate pre-step, commit, treat as design system. | |
| You decide | Let Claude decide. | |

**User's choice:** Generate then customize

### v0 Initialization

| Option | Description | Selected |
|--------|-------------|----------|
| Template init + design prompt | v0.chats.init with template baseline, then v0.chats.create with design prompt. | ✓ |
| Prompt-only | Just v0.chats.create with detailed text prompt. Simpler, less consistent. | |
| You decide | Let Claude pick approach for best dark theme consistency. | |

**User's choice:** Template init + design prompt

---

## v0 SDK Risk Mitigation (update session)

### Fallback Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| v0 optional, manual fallback | Use v0 as time-saver, hand-build with shadcn/ui if it fails | ✓ |
| Skip v0, hand-build only | Build everything by hand, no v0 dependency | |
| Time-boxed v0 attempt | Try v0 with 30 min cap, switch if needed | |

**User's choice:** v0 optional, manual fallback
**Notes:** No hard dependency on v0 — it's a nice-to-have acceleration, not a blocker.

### v0 Timing

| Option | Description | Selected |
|--------|-------------|----------|
| v0 first, then customize/fallback | Run v0 as first task, customize or rebuild after | ✓ |
| Build first, v0 polish pass | Hand-build core, use v0 to refine at end | |
| You decide | Let Claude determine timing | |

**User's choice:** v0 first, then customize/fallback

### v0 Scope (revised)

| Option | Description | Selected |
|--------|-------------|----------|
| Full page generation | Generate complete report page in one prompt | |
| Component-by-component | Generate individual components as separate v0 prompts | ✓ |
| Layout only from v0 | Generate structure only, build components by hand | |

**User's choice:** Component-by-component (revised from initial "Full page generation")

---

## shadcn/ui Foundation (update session)

### Style Variant

| Option | Description | Selected |
|--------|-------------|----------|
| New York style | Standard, widely documented, clean look | ✓ |
| Default style | Slightly more rounded, softer look | |
| You decide | Let Claude pick | |

**User's choice:** New York style

### Dark Theme Strategy (confirmed)

| Option | Description | Selected |
|--------|-------------|----------|
| Dark-only | No light mode, dark by default | |
| System preference toggle | Light for light OS, dark for dark OS | ✓ |
| Dark default + toggle | Dark by default with manual toggle | |

**User's choice:** System preference toggle (confirmed from initial session)

### Color Palette

| Option | Description | Selected |
|--------|-------------|----------|
| Zinc (neutral grey) | Clean, neutral, works with severity badges | ✓ |
| Slate (blue-grey) | More like monitoring tools (Datadog/Grafana) | |
| You decide | Let Claude pick | |

**User's choice:** Zinc (neutral grey)

---

## Empty & Error States (update session)

### Non-existent Report (404)

| Option | Description | Selected |
|--------|-------------|----------|
| Branded 404 page | "Report not found" with ClawGuard branding | ✓ |
| Redirect to dashboard | Redirect instead of 404 | |
| You decide | Let Claude decide | |

**User's choice:** Branded 404 page

### Processing State

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton + auto-refresh | Animated skeleton placeholders, polls every few seconds | ✓ |
| Simple spinner message | "Analysis in progress..." with spinner | |
| Skeleton, manual refresh | Skeleton without auto-refresh | |

**User's choice:** Skeleton + auto-refresh

### Error State

| Option | Description | Selected |
|--------|-------------|----------|
| Generic error + re-run hint | Generic message with re-run suggestion | ✓ |
| Partial results + error banner | Show whatever completed before error | |
| You decide | Let Claude decide | |

**User's choice:** Generic error + re-run hint

---

## Data Loading Strategy (update session)

### Data Fetch Method

| Option | Description | Selected |
|--------|-------------|----------|
| Server component | Server-side fetch at request time | ✓ |
| Client-side fetch + polling | Client fetches after page loads | |
| Server initial + client polling | Hybrid: server for first load, client for updates | |

**User's choice:** Server component

### Polling Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Client polling on processing page | Small client component polls API, reloads on complete | ✓ |
| Manual refresh only | User must refresh manually | |
| You decide | Let Claude decide | |

**User's choice:** Client polling on processing page

### API Endpoint

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated API route | `/api/report/[owner]/[repo]/[pr]/route.ts` | ✓ |
| Server Actions | Lighter weight but less reusable | |
| You decide | Let Claude decide | |

**User's choice:** Dedicated API route

---

## Claude's Discretion

- Exact shadcn/ui component selection and composition
- Mermaid diagram styling and theme configuration
- Threat Model tab internal layout
- Compliance tab table structure
- Loading skeleton component design
- v0 prompt engineering
- Severity color palette
- Caching/revalidation strategy
- Polling interval tuning

## Deferred Ideas

None — discussion stayed within phase scope
