# ClawGuard

## What This Is

ClawGuard is an AI-powered security agent that reviews GitHub pull requests, finds vulnerabilities, auto-fixes and commits them, and generates interactive security reports — all from a single Next.js deployment. Developers @mention `@clawguard` on a PR to trigger a 3-phase security audit; the bot posts a summary card with findings and a link to a full interactive report page. It can also fix vulnerabilities, commit them to the PR branch, and re-audit — behaving like an autonomous coding agent that iterates until the code is clean.

## Core Value

When a developer @mentions ClawGuard on a PR, it must find real vulnerabilities, show them clearly in an interactive report, and fix them autonomously — the complete loop from detection to remediation in one tool.

## Requirements

### Validated

- [x] 3-phase security pipeline: code quality review → vulnerability scan → threat model — *Validated in Phase 2: security-analysis-pipeline*
- [x] ToolLoopAgent (via Vercel AI Gateway) analyzes code with bash tools — *Validated in Phase 2*
- [x] Structured JSON output with findings, scores, CWE/OWASP mappings — *Validated in Phase 2*
- [x] Security scoring: 0-100 numeric with A-F grade, deductions by severity — *Validated in Phase 2*
- [x] JSX summary Card posted to PR thread with severity badges, findings table, report link — *Validated in Phase 2 (GFM markdown card)*
- [x] Audit results stored in Upstash Redis keyed by `{owner}/{repo}/pr/{number}` — *Validated in Phase 2*

### Active

- [ ] GitHub webhook receives @mention events and triggers the security audit pipeline
- [ ] Vercel Sandbox clones repo and checks out PR branch for isolated analysis
- [x] Interactive web report at `/report/[owner]/[repo]/[pr]` with dark theme shadcn/ui — *Validated in Phase 4: interactive-web-report*
- [x] Report: security score gauge, OWASP distribution chart, expandable finding cards — *Validated in Phase 4*
- [x] Report: Mermaid data flow diagrams per finding, attack path diagrams in threat model — *Validated in Phase 4*
- [x] Report: before/after code diffs with syntax highlighting — *Validated in Phase 4*
- [x] Report: compliance mapping table (PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS) — *Validated in Phase 4*
- [x] v0 SDK integration for generating/refining report UI from template baseline — *Validated in Phase 4 (dev-time script)*
- [ ] Auto-fix: agent generates fix in sandbox → validates → commits to PR branch via Octokit
- [ ] Re-audit after fixes with updated score posted to thread
- [ ] Follow-up chat: developer can ask questions in PR thread, bot responds with context
- [ ] Action buttons in summary card (Auto-Fix, Auto-Fix All, View Report)
- [ ] `.clawguard/config.yml` reader for per-repo behavior configuration
- [ ] `.clawguard/policies.yml` reader for custom security rules injected into agent prompt
- [ ] Dashboard with GitHub OAuth login showing connected repos and audit history
- [ ] Dashboard per-repo view with PR audit list and security score trend chart
- [ ] Audit results stored in Upstash Redis keyed by `{owner}/{repo}/pr/{number}`- [ ] Vulnerable demo repo (`techcorp-api`) with 3 PRs containing planted vulnerabilities

### Out of Scope

- Maritime.sh deployment — nice sponsor signal but not critical for winning
- Dashboard score trend chart — static list of audits is sufficient
- Voice/audio features — not targeting ElevenLabs prize
- Mobile app — web-first only
- Real-time chat between users — not a collaboration tool
- Multi-provider AI support beyond Vercel AI Gateway — single provider is fine

## Context

**Hackathon:** OpenClaw Hack_001 — Vienna's First Overnight AI Agent Hackathon. Targeting both Track 1 (OpenClaw & Agents) and Track 2 (Cybersecurity) — only crossover project. Judges include a top competitive hacker (Alexis Lingad), an AI agents expert (Arvind Anandakumar), and a YC S26 founder (Mojmir Horvath).

**Strategic angle:** The interactive report is the visual wow factor for the cybersecurity judge. The agentic fix loop (find → fix → validate → commit → re-audit) demonstrates real agent autonomy for the agents judge. The dashboard + config system makes it look like a real SaaS product for the YC judge.

**Three surfaces:**
1. **GitHub PR Thread** — Bot posts summary card, handles follow-up chat, triggers fixes
2. **Interactive Web Report** — Per-PR security dashboard at `/report/[owner]/[repo]/[pr]`
3. **Dashboard** — Authenticated web app showing repos, audit history, trends

**Demo strategy:** Live demo against `techcorp-api` repo with planted vulnerabilities. Show @mention → audit → report → auto-fix → re-audit flow in 3 minutes.

**v0 SDK approach:** Use `v0.chats.init({ type: 'files' })` with a template baseline, then `v0.chats.create()` with a design system prompt to generate/refine report components. Template provides consistent globals.css, shared components, and theme variables.

## Constraints

- **Tech stack**: Next.js (App Router), Vercel Chat SDK + GitHub adapter, AI SDK ToolLoopAgent, Vercel Sandbox, shadcn/ui + Tailwind dark theme, Recharts, Mermaid, NextAuth.js, Upstash Redis
- **AI provider**: Vercel AI Gateway (not direct Anthropic API) — model configurable via `.clawguard/config.yml`
- **Deployment**: Single Next.js app on Vercel — no separate backend services
- **Architecture**: Everything in one deployment — webhook handler, API routes, report pages, dashboard all colocated
- **Design**: Dark theme, professional/dense enterprise aesthetic, not hackathon-toy looking

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single Next.js deployment | Simplicity, fast iteration, single Vercel deploy | — Pending |
| Vercel AI Gateway over direct Anthropic | Team has Vercel setup, model configurable per-repo | — Pending |
| v0 SDK for report generation | Higher wow factor, template-based consistency via init API | — Pending |
| Chat SDK with GitHub adapter | Purpose-built for PR bot pattern, handles webhooks/cards/streaming | — Pending |
| Upstash Redis for state | Serverless-native, works with Vercel, stores audit JSON + conversation state | — Pending |
| Pre-built demo repo with planted vulns | Reliable demo, known findings, no surprises during presentation | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after Phase 4 completion*
