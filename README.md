<h1 align="center">ClawGuard</h1>

<p align="center">
  <strong>AI-powered security agent that audits GitHub PRs, finds vulnerabilities, auto-fixes them, and generates interactive reports</strong>
</p>

<!-- Add hero screenshot: summary card + report page -->

<p align="center">
  <a href="https://github.com/Julian-AT/clawguard"><img src="https://img.shields.io/badge/OpenClaw-Hack__001-blue?style=flat-square" alt="OpenClaw Hack_001"></a>
  <img src="https://img.shields.io/badge/Track-OpenClaw_%26_Agents-5865F2?style=flat-square" alt="Track OpenClaw and Agents">
  <img src="https://img.shields.io/badge/Track-Cybersecurity-ED4245?style=flat-square" alt="Track Cybersecurity">
  <img src="https://img.shields.io/badge/Location-Vienna-1a1a1a?style=flat-square" alt="Vienna">
  <img src="https://img.shields.io/badge/Stack-Next.js_16_%2B_AI_SDK-black?style=flat-square" alt="Stack">
</p>

## Overview

ClawGuard is a single [Next.js](https://nextjs.org/) deployment on Vercel: a GitHub App webhook receives PR events, the [Chat SDK](https://chat-sdk.dev) GitHub adapter drives the thread, and an analysis pipeline runs inside an isolated [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox)—clone, diff, reconnaissance, then AI-assisted scan and threat synthesis. Structured audit JSON is stored in Upstash Redis; the bot posts a JSX summary card and links to a full report. Critical and high findings can be fixed in the sandbox, validated, and committed back to the PR branch, with re-audit to close the loop.

**Three surfaces:**

1. **GitHub PR thread** — @mention `@clawguard`, summary card, fix/re-audit commands.
2. **Interactive report** — `/report/[owner]/[repo]/[pr]` (and `/report/demo` without Redis).
3. **Dashboard** — NextAuth GitHub OAuth, repos with audits, trends, learnings, tracking.

Unlike static linters alone, ClawGuard reasons over the changed tree with tools in a real checkout, synthesizes a threat model, and can apply fixes with a validation gate—not only flag lines.

## The problem

Traditional SAST and secret scanners excel at fast, rule-based signals but often miss context across files, abuse scenarios, and architectural boundaries. Security reviews that stay in comments rarely ship patches. ClawGuard targets the gap between **detection** and **remediation**: one agentic path from PR event to stored audit, human-readable report, and optional autonomous fix plus re-audit.

## Core features

### Security analysis

- Isolated clone and diff in Vercel Sandbox; recon pass over changed files and repo context.
- Sequential pipeline: recon → change analysis → security scan (`ToolLoopAgent` + `bash-tool`) → threat synthesis → post-processing (score, grade, filters, compliance mapping).
- Findings carry CWE, OWASP categories, optional STRIDE, data-flow notes, and Mermaid where generated.
- Compliance-style mapping for frameworks such as PCI-DSS, SOC2, HIPAA, NIST, and OWASP ASVS when present on findings.

### Auto-fix

- Deterministic application of `fix.before` / `fix.after` when available; LLM fix agent with the same bash tool surface as a fallback.
- Validation gate before any commit (TypeScript, ESLint, Biome, tests when present); batch commits when configured.
- Re-audit after successful fixes to refresh the stored audit and thread summary.

### Interactive reports

- Score gauge (Recharts), severity breakdown, OWASP distribution chart.
- Tabs: Findings (search, filter, accordions), PR Summary (narrative, sequence diagrams), Threat Model (risk, boundaries, attack paths), Compliance (tabular mapping).
- Shiki-highlighted code and side-by-side diffs; Mermaid rendered client-side.
- Live processing via stream events and polling (`GET /api/report/.../stream`).

### PR integration

- Chat SDK JSX card: severity counts, top findings table, **Fix All**, **Re-audit**, **View full report**.
- Comment commands: `fix all`, `fix <type>`, `re-audit` / `scan` / `review` style triggers; optional LLM intent classification when heuristics do not match.
- Configurable trigger mode (mention-only, automatic, or both), draft and label ignores, cooldown between runs.
- Feedback phrases in comments can be captured as learnings for future scans.

### Dashboard and product surfaces

- GitHub sign-in; org-level list of repos that have audits; per-repo history with latest score/grade and optional trend line when multiple audits exist.
- Routes for org learnings, repo learnings, org knowledge injection, and post-merge tracking metrics per repo.

### Post-merge tracking

- Correlates audit predictions with later issue activity where configured; surfaces precision-oriented metrics on the tracking dashboard.

### Multi-platform

- Webhook routes for Slack, Teams, and Linear via shared Chat SDK wiring; optional env vars in `.env.example`. Discord is documented as a sidecar (native deps not bundled).

### Stretch / configuration

- Target **audited** repo files: `.clawguard/config.yml` for thresholds, model, scanning depth, triggers, autofix, analysis toggles, learnings, tracking; `.clawguard/policies.yml` for extra policy rules merged into the scan prompt.
- Defaults live in [`lib/config/defaults.ts`](lib/config/defaults.ts). Full option layout: [`clawguard-plan.md`](clawguard-plan.md).

## System architecture

```mermaid
flowchart LR
  trigger["PR mention or configured auto-trigger"]
  webhook["POST /api/webhooks/github"]
  bot["Chat SDK + lib/bot.ts"]
  pipeline["runAuditPipeline → runSecurityPipeline"]
  sandbox["Vercel Sandbox clone + diff"]
  kv["Audit JSON + stream Upstash REST"]
  thread["Summary card on PR"]
  page["/report/owner/repo/pr"]
  sse["GET /api/report/.../stream SSE"]
  dash["/dashboard"]

  trigger --> webhook --> bot --> pipeline
  pipeline --> sandbox
  pipeline --> kv
  bot --> thread
  kv --> page
  kv --> sse
  kv --> dash
```

## Agent pipeline

The production path is sequential: each stage hands context to the next. **Change analysis** uses structured generation (`generateObject`) for PR summaries when enabled. **Security scan** and **threat synthesis** are Vercel AI SDK `ToolLoopAgent` runs with Zod output schemas and `bash-tool` exposing shell/file access inside the sandbox (step limit from config). **Post-processing** applies scoring, grading, ignore paths, and compliance normalization.

```mermaid
flowchart TD
  subgraph triggers [Triggers]
    mention["@clawguard on PR"]
    auto["PR opened or pushed when trigger.mode allows"]
  end

  subgraph sandbox [Vercel Sandbox]
    clone["git clone + checkout PR branch"]
    diff["git diff vs base branch"]
  end

  subgraph pipeline [runSecurityPipeline]
    recon["Reconnaissance languages, excerpts, deps, secrets, SARIF hints"]
    change["Change Analysis optional PR summary + sequence diagrams"]
    scan["Security Scan Agent ToolLoopAgent + bash tools structured findings"]
    threat["Threat Synthesis Agent ToolLoopAgent dedup + threat model STRIDE"]
    post["Post-Processing score, grade, filters, compliance mapping"]
  end

  triggers --> sandbox
  sandbox --> pipeline
  pipeline --> redis["Upstash Redis audit + SSE stream keys"]
  redis --> outputs["PR card, JSON API, report page, dashboard"]
```

## Auto-fix loop

Critical and high findings can be fixed from the thread (`@clawguard fix all`, `@clawguard fix <type>`, or card buttons). Fixes apply in a fresh sandbox, prefer stored before/after snippets, fall back to a dedicated fix `ToolLoopAgent` when needed, then run validation. Successful changes are committed to the PR branch via the GitHub API; the pipeline can run again to re-audit.

```mermaid
flowchart LR
  ch["CRITICAL and HIGH findings with fix hints"]
  sb["Sandbox checkout PR branch"]
  apply["Apply patch or fix agent"]
  val["Validate tsc, eslint, biome, tests"]
  commit["Commit to branch via Octokit"]
  reaudit["reviewPullRequest re-run"]

  ch --> sb --> apply --> val
  val -->|pass| commit --> reaudit
  val -->|fail| revert["Revert file state"]
```

## How it works

### End-to-end request flow

1. Configure a GitHub App whose webhook targets `POST /api/webhooks/github`.
2. On mention or configured auto-trigger, the adapter delivers the event; [`lib/bot.ts`](lib/bot.ts) routes intents (audit, fix, re-audit).
3. [`runAuditPipeline`](lib/github-audit-runner.ts) invokes [`runSecurityPipeline`](lib/analysis/pipeline.ts) with a sandbox checkout of the PR branch.
4. Progress and final [`AuditData`](lib/redis.ts) are written under `{owner}/{repo}/pr/{number}` in Upstash REST; stream keys back SSE for the report UI.
5. The bot posts a JSX summary card; users open `/report/[owner]/[repo]/[pr]` for the full interactive view. The dashboard reads the same keys for history and trends.

### Agent runtime model

- **Tool-driven loops**: security scan and threat synthesis use `ToolLoopAgent` with `bash-tool` for shell and file operations inside the sandbox.
- **Structured output**: Zod schemas for findings and downstream post-processing.
- **Sequential pipeline**: recon and change analysis feed context into scan and synthesis; post-processing is deterministic scoring and normalization.

[`lib/agents/`](lib/agents/) contains registry and orchestrator code paths that are not the main production pipeline entry—primary analysis is [`lib/analysis/`](lib/analysis/).

### Pipeline stages (summary)

| Stage | Role |
|-------|------|
| Recon | Languages, excerpts, deps, secrets, SARIF hints over the change set |
| Change analysis | Optional PR summary and sequence diagrams via structured generation |
| Security scan | Broad vulnerability pass with tool loop and bash access |
| Threat synthesis | Dedup, STRIDE-oriented narrative, executive-style summary |
| Post-processing | Score 0–100, letter grade, ignore paths, compliance tags |

## Technology stack

| Layer | Packages / notes |
|-------|------------------|
| App | Next.js 16.2.1 (App Router), React 19.2.4, TypeScript 5.x |
| Styling | Tailwind CSS 4.2.2, shadcn/ui, `tailwind-merge`, `class-variance-authority` |
| AI | `ai` 6.0.141 (Vercel AI SDK, `ToolLoopAgent`), models via Vercel AI Gateway |
| Bot | `chat` 4.23.0, `@chat-adapter/github`, `@chat-adapter/state-redis` |
| Sandbox & tools | `@vercel/sandbox` 1.9.0, `bash-tool` 1.3.15 |
| GitHub | `@octokit/rest` 22.0.1 |
| Data | `@upstash/redis` 1.37.0 (audits); TCP `REDIS_URL` for Chat SDK state |
| Auth | `next-auth` 4.24.13, `@auth/core` 0.34.3 |
| Report UI | Recharts, Mermaid, Shiki, `react-diff-viewer-continued`, `@v0-sdk/react` (v0-generated UIs) |
| Config & validation | `yaml` 2.8.3, `zod` 4.3.6 |
| Quality | Biome, Vitest |

More detail: [`.planning/research/STACK.md`](.planning/research/STACK.md), product context in [`CLAUDE.md`](CLAUDE.md).

## Prerequisites

- **Node** 20+ (Next.js 16)
- **GitHub App** installed on target repos, webhook URL set, permissions for PRs and comments as required by your workflow
- **Upstash-compatible REST Redis** for audit payloads and stream keys — `KV_REST_API_URL` and `KV_REST_API_TOKEN`
- **TCP Redis** for Chat SDK thread state — `REDIS_URL` (separate from Upstash REST)
- **Vercel AI Gateway** — OIDC on Vercel; locally, `vercel link` and `vercel env pull` to align credentials

Optional: **V0 API key** only if you run `npm run v0:generate` for offline report UI experiments.

## Setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local — see below
npm run dev
```

Point the GitHub App webhook at your deployment (or a tunnel such as ngrok for local dev) with path `/api/webhooks/github`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_BOT_USERNAME` | GitHub App for Chat SDK adapter |
| `GITHUB_TOKEN` | Octokit: PR metadata, commits, sandbox `git` auth |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash REST — audits and stream lists |
| `REDIS_URL` | TCP Redis — Chat SDK state adapter |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Dashboard GitHub OAuth |
| `NEXT_PUBLIC_APP_URL` | Absolute links in PR comments to `/report/...` |
| `NEXT_PUBLIC_GITHUB_APP_URL` | Optional install/settings link on dashboard |

Optional: `CLAWGUARD_INTENT_MODEL`, `CLAWGUARD_LEARNING_MODEL`; adapter tokens for Slack / Teams / Linear (see `.env.example`).

After linking the Vercel project, `vercel env pull` is usually the fastest way to sync KV and gateway-related variables locally.

## Project layout

```
app/
  api/auth/[...nextauth]/     # NextAuth
  api/report/[owner]/[repo]/[pr]/   # JSON audit + SSE stream
  api/webhooks/github/        # Primary webhook
  api/webhooks/{slack,linear,teams}/  # Optional platform stubs
  dashboard/                  # OAuth dashboard, repo, learnings, knowledge, tracking
  report/[owner]/[repo]/[pr]/     # Interactive report + demo route
components/
  dashboard/                  # Trends, repo tables
  report/                     # Report shell, charts, findings, mermaid, diffs
  ui/                         # shadcn-style primitives
lib/
  analysis/                   # Pipeline, recon, scan, threat synthesis, scoring, types
  agents/                     # Registry and orchestrator code paths (not wired to main pipeline)
  bot.ts                      # Chat SDK entry, intents, audit/fix routing
  cards/                      # Summary JSX + markdown for Issues API
  config/                     # YAML loading, defaults, Zod schemas
  fix/                        # Apply, validate, commit, fix agent
  github-audit-runner.ts      # runAuditPipeline, Redis, progress, cards
  learnings/ , knowledge/     # Injected scan context
  redis.ts , redis-queries.ts # Storage and dashboard key scans
  stream-events.ts            # SSE payload helpers
  tracking/                   # Post-merge metrics
tests/                        # Vitest — bot, webhooks, analysis, fix, components
```

## Scripts

```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "biome check",
"lint:fix": "biome check --write",
"format": "biome format --write",
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage",
"v0:generate": "tsx scripts/v0-generate.ts"
```

## Configuration

Per-**target-repo** files (in the repository being audited, not necessarily this app’s repo):

- **`.clawguard/config.yml`** — thresholds, model, scanning depth, triggers, autofix, analysis toggles, learnings, tracking.
- **`.clawguard/policies.yml`** — extra policy rules merged into the scan prompt.

Defaults and loading: [`lib/config/`](lib/config/). Full specification: [`clawguard-plan.md`](clawguard-plan.md).

---

<p align="center">
  Built for <strong>OpenClaw Hack_001</strong> &mdash; Vienna's first overnight AI agent hackathon<br/>
  Cross-track: OpenClaw &amp; Agents · Cybersecurity
</p>
