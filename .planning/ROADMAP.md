# Roadmap: ClawGuard

## Overview

ClawGuard delivers a complete AI security agent for GitHub PRs: from @mention trigger through vulnerability detection, interactive reporting, and autonomous remediation. The build order is risk-first -- validating the highest-uncertainty integration (Chat SDK + Next.js) immediately, then layering the analysis pipeline, auto-fix loop, interactive report, extended product features, and finally hardening the demo for the hackathon presentation. Each phase produces outputs consumed by the next, and the first four phases constitute the minimum viable demo.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Bot Wiring** - Validate Chat SDK + Next.js integration, webhook handler, sandbox, Redis, and AI Gateway connectivity
- [ ] **Phase 2: Security Analysis Pipeline** - 3-phase audit producing structured findings with scores, posted as summary card to PR thread
- [ ] **Phase 3: Auto-Fix & Commit Loop** - Agent generates fixes in sandbox, validates, commits to PR branch, re-audits with updated score
- [ ] **Phase 4: Interactive Web Report** - Rich per-PR security report page with score gauge, charts, diagrams, diffs, and compliance mapping
- [ ] **Phase 5: Chat, Config & Dashboard** - Follow-up conversation in PR thread, per-repo configuration/policies, authenticated dashboard
- [ ] **Phase 6: Demo Hardening** - Demo repo with planted vulnerabilities, pre-computed fallbacks, end-to-end rehearsal validation

## Phase Details

### Phase 1: Foundation & Bot Wiring
**Goal**: A GitHub @mention reaches the app, triggers background processing in a sandbox, stores results in Redis, and posts a response to the PR thread -- the full infrastructure chain proven end-to-end
**Depends on**: Nothing (first phase)
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05, SCAN-01, SCAN-07, SCAN-08
**Success Criteria** (what must be TRUE):
  1. When a user @mentions @clawguard on a PR, the webhook receives the event and returns 200 within 10 seconds
  2. The bot posts an acknowledgment message to the PR thread confirming it received the mention
  3. A Vercel Sandbox successfully clones the target repo and checks out the PR branch
  4. Analysis results are stored in Upstash Redis and retrievable by `{owner}/{repo}/pr/{number}` key
  5. Duplicate webhook deliveries for the same event do not trigger duplicate processing
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffold & core modules (Redis client, Sandbox review pipeline)
- [x] 01-02-PLAN.md — Bot integration, webhook handler, tests & end-to-end verification

### Phase 2: Security Analysis Pipeline
**Goal**: The 3-phase security audit (code quality, vulnerability scan, threat model) produces structured findings with severity scores and CWE/OWASP mappings, and posts a summary card with results to the PR thread
**Depends on**: Phase 1
**Requirements**: SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06, CARD-01, CARD-02, CARD-03
**Success Criteria** (what must be TRUE):
  1. After @mention, the bot runs a 3-phase analysis (code quality review, vulnerability scan, threat model) and posts a summary card to the PR thread
  2. The summary card displays a security score (0-100 numeric with A-F grade), severity count badges, and a top findings table with severity, type, and file location
  3. Each finding in stored results includes severity, type, file:line location, CWE ID, OWASP Top 10 category, description, attack scenario, data flow chain, before/after code fix, and compliance mapping
  4. The summary card includes a "View Full Report" link pointing to `/report/[owner]/[repo]/[pr]`
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Types, scoring, summary card builder, and Redis type update
- [x] 02-02-PLAN.md — 3-phase analysis agents and pipeline orchestrator
- [x] 02-03-PLAN.md — Bot integration with live progress updates and card posting

### Phase 3: Auto-Fix & Commit Loop
**Goal**: The agent autonomously fixes vulnerabilities by generating patches in a sandbox, validating them, committing to the PR branch, and re-auditing to prove the fixes work
**Depends on**: Phase 2
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, CARD-04
**Success Criteria** (what must be TRUE):
  1. Triggering "Auto-Fix" on a finding causes the bot to generate a fix in a sandbox, validate it (syntax/lint check), and commit it to the PR branch with a descriptive commit message
  2. The bot posts a confirmation in the PR thread with the commit SHA and a description of what was fixed
  3. "Fix All" processes all CRITICAL and HIGH findings sequentially, committing each validated fix
  4. After all fixes are committed, a full re-audit runs automatically and a new summary card is posted with the updated security score
  5. Action buttons (Auto-Fix per finding, Auto-Fix All, View Report) appear in the summary card
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Fix pipeline core: types, apply, validate, commit, agent modules + tests
- [x] 03-02-PLAN.md — Summary card JSX conversion with action labels and LinkButton
- [x] 03-03-PLAN.md — Fix orchestrator, bot integration with intent detection and re-audit flow

### Phase 4: Interactive Web Report
**Goal**: Users can view a rich, interactive security report for any audited PR at a shareable URL with professional dark-theme enterprise aesthetic
**Depends on**: Phase 2 (reads audit JSON from Redis; can start once Phase 2 produces sample data)
**Requirements**: REPT-01, REPT-02, REPT-03, REPT-04, REPT-05, REPT-06, REPT-07, REPT-08, REPT-09, REPT-10, REPT-11, REPT-12, REPT-13, REPT-14
**Success Criteria** (what must be TRUE):
  1. Visiting `/report/[owner]/[repo]/[pr]` renders a complete security report from stored audit data, with ClawGuard branding, repo name, PR title/number, and audit timestamp
  2. The report displays a large color-coded security score gauge (green A/B, amber C, red D/F) with severity breakdown badges and an OWASP Top 10 distribution bar chart
  3. Each finding is an expandable card showing severity badge, vulnerability type, file:line, CWE/OWASP tags, full description, attack scenario callout, Mermaid data flow diagram, and before/after code diff with syntax highlighting
  4. The report includes a Threat Model tab with attack surface entries and Mermaid attack path diagrams, and a Compliance tab mapping findings to PCI DSS, SOC 2, HIPAA, NIST, and OWASP ASVS
  5. The report uses dark theme with shadcn/ui components, is shareable via URL without authentication, and v0 SDK is used at dev-time for component generation
**Plans**: TBD
**UI hint**: yes

Plans:
- [x] 04-01: Report infrastructure -- shadcn/ui, enhanced schemas, mock data, page shell
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Chat, Config & Dashboard
**Goal**: The product behaves like a real SaaS tool with conversational follow-up in PR threads, per-repo configuration and custom security policies, and an authenticated dashboard showing audit history
**Depends on**: Phase 2 (chat and dashboard read audit data), Phase 3 (chat can trigger fixes)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, SCAN-09, DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. A developer can @mention the bot with a follow-up question in the PR thread and receive a contextual, security-focused response that references the audit findings
  2. A developer can request specific fixes via chat (e.g., "fix the SQL injection in users.ts") and the bot triggers the auto-fix flow for that finding
  3. The bot reads `.clawguard/config.yml` and `.clawguard/policies.yml` from the repo before each audit, applying configuration (autoFix toggle, severity thresholds, ignorePaths, model override) and injecting custom security policies into the analysis prompt
  4. Repos without config files work with sensible defaults -- no errors, no missing behavior
  5. A user can log in with GitHub OAuth and view a dashboard showing connected repos with last audit and score, plus a per-repo page listing all PR audits with scores, severity counts, and report links
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Demo Hardening
**Goal**: The live demo runs flawlessly against the `techcorp-api` repo with planted vulnerabilities, with pre-computed fallbacks and graceful degradation for every failure mode
**Depends on**: Phases 1-5
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05
**Success Criteria** (what must be TRUE):
  1. The `techcorp-api` demo repo contains realistic Express.js code with 3 PRs, each containing a distinct set of planted vulnerabilities (auth/secrets, file upload/XSS, payment/SSRF), plus `.clawguard/config.yml` and `policies.yml`
  2. Running the full @mention-to-report flow against each demo PR produces consistent, accurate findings that match the planted vulnerabilities across 5+ consecutive runs
  3. The auto-fix flow successfully patches at least one vulnerability per demo PR and the re-audit shows an improved security score
  4. Pre-computed results are cached in Redis as fallback, and the demo degrades gracefully (shows cached results) if any external service is unavailable during the live presentation
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Bot Wiring | 0/2 | Not started | - |
| 2. Security Analysis Pipeline | 3/3 | Complete | 2026-03-27 |
| 3. Auto-Fix & Commit Loop | 1/3 | In Progress|  |
| 4. Interactive Web Report | 1/3 | In Progress | - |
| 5. Chat, Config & Dashboard | 0/3 | Not started | - |
| 6. Demo Hardening | 0/2 | Not started | - |
