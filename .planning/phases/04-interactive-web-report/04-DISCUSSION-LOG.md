# Phase 4: Interactive Web Report - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 04-interactive-web-report
**Areas discussed:** Report layout & navigation, Score gauge & chart presentation, Finding card design & interaction, v0 SDK workflow & scope

---

## Report Layout & Navigation

### Page Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Tabbed sections | Findings tab default. Threat Model and Compliance as separate tabs. Keeps page focused. | ✓ |
| Single scroll with sidebar nav | Everything on one page with sticky nav sidebar. Good for printing, bad for long reports. | |
| Tabs + sidebar index | Tabs plus left sidebar with findings list for quick jump-to. Most complex. | |

**User's choice:** Tabbed sections
**Notes:** None

### Header Density

| Option | Description | Selected |
|--------|-------------|----------|
| Dense hero header | Score gauge + OWASP chart + severity badges all in header. Maximum visual impact. | ✓ |
| Compact header, chart in tab | Just score + badges in header, OWASP chart inside Findings tab. | |
| You decide | Let Claude decide best balance. | |

**User's choice:** Dense hero header
**Notes:** None

### Information Density

| Option | Description | Selected |
|--------|-------------|----------|
| High density | Tight spacing, smaller text, lots of data. Like Datadog/Grafana. Enterprise-grade. | ✓ |
| Medium density | Generous whitespace, larger cards, modern SaaS feel. Like Linear/Vercel. | |
| You decide | Let Claude pick based on content volume and dark theme readability. | |

**User's choice:** High density
**Notes:** None

### Dark Theme Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Dark only | Always dark, no toggle. Simpler, stronger brand identity. | |
| Dark default, light toggle | Default dark with a toggle in header. More accessible. | |
| System preference | Follow OS preference via prefers-color-scheme. Current globals.css already has this. | ✓ |

**User's choice:** System preference
**Notes:** Builds on existing globals.css pattern

---

## Score Gauge & Chart Presentation

### Score Gauge Style

| Option | Description | Selected |
|--------|-------------|----------|
| Semicircle gauge | Half-circle arc with score in center, grade below. Color gradient. Recharts RadialBarChart. | ✓ |
| Circular ring | Full 360° ring with score in center. More compact. | |
| Number + badge | Large number with grade badge. No chart, pure CSS. Fastest to build. | |

**User's choice:** Semicircle gauge
**Notes:** None

### OWASP Chart Style

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal bar chart | Categories on Y-axis, counts as horizontal bars. Color-coded by severity. Standard for security reports. | ✓ |
| Radar chart | Spider chart with OWASP categories as axes. More visual but harder to read values. | |
| You decide | Let Claude pick. | |

**User's choice:** Horizontal bar chart
**Notes:** None

### Severity Badges

| Option | Description | Selected |
|--------|-------------|----------|
| Inline pill badges | Colored pill badges next to score gauge. Inline, compact. | ✓ |
| Stacked severity cards | Small stacked cards showing severity count with icon. More vertical space. | |
| You decide | Let Claude pick. | |

**User's choice:** Inline pill badges
**Notes:** None

---

## Finding Card Design & Interaction

### Card Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Accordion expand | Cards expand in-place. Collapsed: severity, type, file:line, CWE. Expanded: full details + diagrams + diffs. | ✓ |
| Click to open detail panel | Click opens side-panel overlay with all details. Keeps context. More complex. | |
| Fully expanded | All details visible always. Long page, no interaction. Simplest. | |

**User's choice:** Accordion expand
**Notes:** None

### Mermaid Diagrams

| Option | Description | Selected |
|--------|-------------|----------|
| Inline Mermaid in card | Render client-side inside expanded cards. Lazy-load mermaid library on first expand. | ✓ |
| Text-based data flow | Simplified text flow (no Mermaid). No dependency. Less visual impact. | |
| You decide | Let Claude decide based on bundle size trade-offs. | |

**User's choice:** Inline Mermaid in card
**Notes:** None

### Code Diff Style

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side diff | Side-by-side before/after panes. react-diff-viewer-continued + shiki. Professional look. | ✓ |
| Unified diff | Like git diff with red/green lines. More compact. Same libraries. | |
| You decide | Let Claude pick best for dark theme and card width. | |

**User's choice:** Side-by-side diff
**Notes:** None

### Sort/Filter

| Option | Description | Selected |
|--------|-------------|----------|
| Severity sort only | Fixed sort: CRITICAL first, then HIGH, MEDIUM, LOW, INFO. No user controls. | ✓ |
| Severity sort + filter toggles | Sort by severity plus filter toggles to show/hide by severity level. | |
| You decide | Let Claude decide based on likely finding count. | |

**User's choice:** Severity sort only
**Notes:** None

---

## v0 SDK Workflow & Scope

### Generation Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full page generation | Use v0 to generate complete report page template with all components. Maximum v0 leverage. | ✓ |
| Cherry-pick components only | Hand-build page structure, v0 for complex individual components only. More control. | |
| Skip v0, build manually | Build everything with shadcn/ui + Recharts manually. Simplest workflow. | |
| You decide | Let Claude decide the right balance. | |

**User's choice:** Full page generation
**Notes:** None

### Workflow Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Generate then customize | Run v0 during execution as build step. Output is starting point, then customize. | ✓ |
| Pre-generate, then build on top | Generate first as separate pre-step, commit, treat as design system. | |
| You decide | Let Claude decide. | |

**User's choice:** Generate then customize
**Notes:** None

### v0 Initialization

| Option | Description | Selected |
|--------|-------------|----------|
| Template init + design prompt | v0.chats.init with template baseline, then v0.chats.create with design prompt. | ✓ |
| Prompt-only | Just v0.chats.create with detailed text prompt. Simpler, less consistent. | |
| You decide | Let Claude pick approach for best dark theme consistency. | |

**User's choice:** Template init + design prompt
**Notes:** None

---

## Claude's Discretion

- Exact shadcn/ui component selection and composition
- Mermaid diagram styling and theme configuration for dark mode
- Threat Model tab internal layout
- Compliance tab table structure
- Loading states and error states
- v0 prompt engineering
- Missing/incomplete audit data handling
- Exact color palette for severity levels

## Deferred Ideas

None
