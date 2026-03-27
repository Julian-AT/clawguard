# Requirements: ClawGuard

**Defined:** 2026-03-27
**Core Value:** When a developer @mentions ClawGuard on a PR, it must find real vulnerabilities, show them clearly in an interactive report, and fix them autonomously — the complete loop from detection to remediation in one tool.

## v1 Requirements

Requirements for hackathon demo. Each maps to roadmap phases.

### Webhook & Bot Integration

- [ ] **HOOK-01**: GitHub webhook endpoint receives @mention events and routes them to the analysis pipeline
- [ ] **HOOK-02**: Chat SDK GitHub adapter handles PR thread interactions (post messages, edit messages, post cards)
- [ ] **HOOK-03**: Background processing via `after()` / `waitUntil` keeps serverless function alive during analysis
- [ ] **HOOK-04**: Webhook signature verification prevents unauthorized requests
- [ ] **HOOK-05**: Idempotent event handling prevents duplicate analysis from webhook retries

### Security Analysis Pipeline

- [ ] **SCAN-01**: Vercel Sandbox clones target repo and checks out the PR branch for isolated analysis
- [ ] **SCAN-02**: Phase 1 (Code Quality Review) — summarizes PR, identifies code smells, architectural impact
- [ ] **SCAN-03**: Phase 2 (Vulnerability Scan) — detects injection flaws, hardcoded secrets, auth gaps, CSRF, IDOR, path traversal, unsafe eval, data exposure, insecure crypto, race conditions, open redirects, missing validation
- [ ] **SCAN-04**: Phase 3 (Threat Model) — maps attack surfaces, generates attack path analysis, assesses compound risk
- [ ] **SCAN-05**: Each finding includes: severity, type, file:line location, CWE ID, OWASP Top 10 category, description, attack scenario, data flow chain (source → transform → sink), before/after code fix, compliance mapping
- [ ] **SCAN-06**: Security score calculated: 0-100 numeric with A-F grade (deductions: CRITICAL=-25, HIGH=-15, MEDIUM=-8, LOW=-3, INFO=-1)
- [ ] **SCAN-07**: Structured JSON output stored in Upstash Redis keyed by `{owner}/{repo}/pr/{number}`
- [ ] **SCAN-08**: ToolLoopAgent uses Vercel AI Gateway (model configurable via config)
- [ ] **SCAN-09**: Custom policies from `.clawguard/policies.yml` injected into agent system prompt

### Auto-Fix & Commit Loop

- [ ] **FIX-01**: Agent generates fix for a specific finding in a new Vercel Sandbox
- [ ] **FIX-02**: Fix is validated in sandbox (tsc --noEmit, linter, or available validation tools)
- [ ] **FIX-03**: Validated fix is committed to PR branch via Octokit Contents API with descriptive commit message
- [ ] **FIX-04**: Bot confirms fix in PR thread with commit details
- [ ] **FIX-05**: "Fix All" processes all CRITICAL and HIGH findings sequentially
- [ ] **FIX-06**: After all fixes committed, full re-audit runs on updated code
- [ ] **FIX-07**: New summary card posted with updated security score

### PR Summary Card

- [ ] **CARD-01**: JSX summary card posted to PR thread with security score (grade + numeric), severity count badges
- [ ] **CARD-02**: Card includes top findings table with severity, type, and location
- [ ] **CARD-03**: Card includes "View Full Report →" link to interactive report page
- [ ] **CARD-04**: Action buttons: Auto-Fix (per finding), Auto-Fix All, View Report

### Follow-Up Chat

- [ ] **CHAT-01**: Developer can @mention bot in PR thread for follow-up questions
- [ ] **CHAT-02**: Bot responds with security-domain expertise using conversation context
- [ ] **CHAT-03**: Conversation state maintained in Upstash Redis across messages
- [ ] **CHAT-04**: Developer can request specific fixes via chat ("fix the SQL injection in users.ts")

### Interactive Web Report

- [ ] **REPT-01**: Report page at `/report/[owner]/[repo]/[pr]` renders from stored audit JSON
- [ ] **REPT-02**: Header with ClawGuard branding, repo name, PR title/number, audit timestamp
- [ ] **REPT-03**: Security score gauge — large circular display with A-F grade, color-coded (green A/B, amber C, red D/F)
- [ ] **REPT-04**: Severity breakdown badges next to score gauge
- [ ] **REPT-05**: OWASP Top 10 distribution chart (Recharts horizontal bar chart)
- [ ] **REPT-06**: Expandable finding cards with severity badge, vuln type, file:line, CWE/OWASP tags
- [ ] **REPT-07**: Finding detail: full description, attack scenario (red-bordered callout), compliance badges
- [ ] **REPT-08**: Mermaid data flow diagram per finding (source → transform → sink)
- [ ] **REPT-09**: Before/after code diff with syntax highlighting per finding
- [ ] **REPT-10**: Threat Model tab with attack surface entries, Mermaid attack path diagram, risk assessment
- [ ] **REPT-11**: Compliance tab with mapping table (Finding, CWE, PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS)
- [ ] **REPT-12**: Dark theme, shadcn/ui components, professional enterprise aesthetic
- [ ] **REPT-13**: Report is shareable via URL (public, no auth required)
- [ ] **REPT-14**: v0 SDK integration — template baseline via `v0.chats.init()`, design generation via `v0.chats.create()`

### Dashboard

- [ ] **DASH-01**: GitHub OAuth login via NextAuth.js
- [ ] **DASH-02**: Dashboard overview page showing grid of connected repo cards (name, last audit, score, open findings)
- [ ] **DASH-03**: Per-repo detail page with list of all PR audits (PR number/title, score, severity counts, report link)
- [ ] **DASH-04**: Dashboard reads from same Redis store as audit results

### Configuration System

- [ ] **CONF-01**: Config reader fetches `.clawguard/config.yml` from repo via Octokit before audit
- [ ] **CONF-02**: Config supports: autoFix toggle, severity thresholds, ignorePaths, report settings, model override
- [ ] **CONF-03**: Policies reader fetches `.clawguard/policies.yml` — custom security rules with name, rule, severity
- [ ] **CONF-04**: Policies injected into ToolLoopAgent system prompt for enforcement during analysis
- [ ] **CONF-05**: Sensible defaults when no config files exist in the repo

### Demo Repository

- [ ] **DEMO-01**: `techcorp-api` demo repo with realistic Express.js code containing planted vulnerabilities
- [ ] **DEMO-02**: PR #1 "Add user authentication" — SQL injection, hardcoded JWT secret + AWS key, missing rate limiting
- [ ] **DEMO-03**: PR #2 "Add file upload endpoint" — path traversal, reflected XSS, missing auth middleware on admin route
- [ ] **DEMO-04**: PR #3 "Add payment processing" — SSRF, eval() on user data, PII logging, missing CSRF protection
- [ ] **DEMO-05**: `.clawguard/config.yml` and `.clawguard/policies.yml` included in demo repo

## v2 Requirements

Deferred to post-hackathon. Tracked but not in current roadmap.

### Dashboard Enhancements

- **DASH-05**: Score trend chart showing security posture evolution across PRs (Recharts)
- **DASH-06**: Filter/search bar on dashboard overview
- **DASH-07**: Notification preferences for audit results

### Extended Platform

- **PLAT-01**: Maritime.sh deployment (Docker container)
- **PLAT-02**: GitLab / Bitbucket adapter support
- **PLAT-03**: IDE integration (VS Code extension)
- **PLAT-04**: Dependency scanning (SCA) integration

### Advanced Analysis

- **ADV-01**: Historical vulnerability database per repo
- **ADV-02**: Custom rule DSL beyond natural language policies
- **ADV-03**: Real-time streaming analysis display in PR thread

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Traditional SAST engine / custom scanner | Building a scanner takes years; LLM IS the scanner — this is a strength |
| Dependency scanning (SCA) | Solved by GitHub Dependabot (free, built-in) |
| Secret scanning | GitHub's secret scanning with push protection handles this |
| IDE plugins | Massive scope increase, zero demo value at hackathon |
| Multi-platform (GitLab, Bitbucket) | Triples integration complexity for zero hackathon value |
| Custom rule DSL | Multi-month effort; natural language policies are more aligned with AI-first positioning |
| Historical vulnerability database | Data moat, not a feature — LLM training data covers known patterns |
| Real-time streaming analysis display | Adds frontend complexity; placeholder + update is sufficient |
| Mobile app | Web-first only |
| Voice/audio features | Not targeting ElevenLabs prize |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOOK-01 | TBD | Pending |
| HOOK-02 | TBD | Pending |
| HOOK-03 | TBD | Pending |
| HOOK-04 | TBD | Pending |
| HOOK-05 | TBD | Pending |
| SCAN-01 | TBD | Pending |
| SCAN-02 | TBD | Pending |
| SCAN-03 | TBD | Pending |
| SCAN-04 | TBD | Pending |
| SCAN-05 | TBD | Pending |
| SCAN-06 | TBD | Pending |
| SCAN-07 | TBD | Pending |
| SCAN-08 | TBD | Pending |
| SCAN-09 | TBD | Pending |
| FIX-01 | TBD | Pending |
| FIX-02 | TBD | Pending |
| FIX-03 | TBD | Pending |
| FIX-04 | TBD | Pending |
| FIX-05 | TBD | Pending |
| FIX-06 | TBD | Pending |
| FIX-07 | TBD | Pending |
| CARD-01 | TBD | Pending |
| CARD-02 | TBD | Pending |
| CARD-03 | TBD | Pending |
| CARD-04 | TBD | Pending |
| CHAT-01 | TBD | Pending |
| CHAT-02 | TBD | Pending |
| CHAT-03 | TBD | Pending |
| CHAT-04 | TBD | Pending |
| REPT-01 | TBD | Pending |
| REPT-02 | TBD | Pending |
| REPT-03 | TBD | Pending |
| REPT-04 | TBD | Pending |
| REPT-05 | TBD | Pending |
| REPT-06 | TBD | Pending |
| REPT-07 | TBD | Pending |
| REPT-08 | TBD | Pending |
| REPT-09 | TBD | Pending |
| REPT-10 | TBD | Pending |
| REPT-11 | TBD | Pending |
| REPT-12 | TBD | Pending |
| REPT-13 | TBD | Pending |
| REPT-14 | TBD | Pending |
| DASH-01 | TBD | Pending |
| DASH-02 | TBD | Pending |
| DASH-03 | TBD | Pending |
| DASH-04 | TBD | Pending |
| CONF-01 | TBD | Pending |
| CONF-02 | TBD | Pending |
| CONF-03 | TBD | Pending |
| CONF-04 | TBD | Pending |
| CONF-05 | TBD | Pending |
| DEMO-01 | TBD | Pending |
| DEMO-02 | TBD | Pending |
| DEMO-03 | TBD | Pending |
| DEMO-04 | TBD | Pending |
| DEMO-05 | TBD | Pending |

**Coverage:**
- v1 requirements: 50 total
- Mapped to phases: 0
- Unmapped: 50 (pending roadmap creation)

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after initial definition*
