<!-- GSD:project-start source:PROJECT.md -->
## Project

**ClawGuard**

ClawGuard is an AI-powered security agent that reviews GitHub pull requests, finds vulnerabilities, auto-fixes and commits them, and generates interactive security reports — all from a single Next.js deployment. Developers @mention `@clawguard` on a PR to trigger a 3-phase security audit; the bot posts a summary card with findings and a link to a full interactive report page. It can also fix vulnerabilities, commit them to the PR branch, and re-audit — behaving like an autonomous coding agent that iterates until the code is clean.

**Core Value:** When a developer @mentions ClawGuard on a PR, it must find real vulnerabilities, show them clearly in an interactive report, and fix them autonomously — the complete loop from detection to remediation in one tool.

### Constraints

- **Tech stack**: Next.js (App Router), Vercel Chat SDK + GitHub adapter, AI SDK ToolLoopAgent, Vercel Sandbox, shadcn/ui + Tailwind dark theme, Recharts, Mermaid, NextAuth.js, Upstash Redis
- **AI provider**: Vercel AI Gateway (not direct Anthropic API) — model configurable via `.clawguard/config.yml`
- **Deployment**: Single Next.js app on Vercel — no separate backend services
- **Architecture**: Everything in one deployment — webhook handler, API routes, report pages, dashboard all colocated
- **Design**: Dark theme, professional/dense enterprise aesthetic, not hackathon-toy looking
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js (App Router) | 16.2.1 | Full-stack framework, single deployment | Latest stable. Supports App Router, Server Actions, Route Handlers. Requires Node >= 20.9.0. Peer-supports React 19. Deploys as one Vercel project covering webhooks, API routes, report pages, and dashboard. |
| React | 19.2.4 | UI runtime | Required by Next.js 16. Specifically >= 19.2.1 needed for @v0-sdk/react compatibility. |
| TypeScript | 6.0.2 | Type safety | Latest stable. Full ecosystem support across all chosen packages. |
| Zod | 4.3.6 | Schema validation, structured AI output | **Must be v4.x** (or >= 3.25.76). The AI SDK `ai@6.x` peer-requires `^3.25.76 \|\| ^4.1.8`. Zod 4 is the current latest and recommended. |
### AI / Agent Layer
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ai (Vercel AI SDK) | 6.0.141 | Agent orchestration, structured generation, tool calling | Core agent framework. Provides `ToolLoopAgent` for the security analysis loop. Includes `@ai-sdk/gateway@3.0.83` as a dependency. Supports `generateText`, `streamText`, and structured output with Zod schemas. |
| @ai-sdk/gateway | 3.0.83 (bundled) | Vercel AI Gateway provider | Bundled with `ai@6.x`. Routes requests through Vercel AI Gateway for model selection (Anthropic, OpenAI, etc.) via a single provider. Requires Vercel OIDC token (auto-available on Vercel deployments). |
### Chat / Bot Layer
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| chat | 4.23.0 | Unified chat bot SDK | Handles webhook parsing, event routing, thread management, and message posting. Platform-agnostic bot logic with adapter pattern. JSX-based cards rendered as GFM Markdown on GitHub. |
| @chat-adapter/github | 4.23.0 | GitHub PR comment integration | Handles @mention detection, PR/issue thread model, webhook signature verification. Bundles `@octokit/auth-app@^8.2.0` and `@octokit/rest@^22.0.1` internally. Thread ID format: `github:{owner}/{repo}:{prNumber}`. |
| @chat-adapter/state-redis | 4.23.0 | Chat state persistence | Stores thread subscriptions and distributed locks. Uses `redis@^5.11.0` (node-redis TCP client) under the hood -- see GOTCHA below. |
### Code Analysis
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @vercel/sandbox | 1.9.0 | Isolated microVM for repo analysis | Ephemeral Linux VMs with git clone, file R/W, and command execution. Supports `node24`/`node22`/`python3.13` runtimes. Requires Vercel OIDC token. 5-minute default timeout (extendable to 45min on Hobby, 5hr on Pro). |
### Report Generation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| v0-sdk | 0.16.4 | v0 Platform API client | Generates/refines report UI components from templates via `v0.chats.init({ type: 'files' })` and `v0.chats.create()`. Requires `V0_API_KEY` env var and paid v0 plan (Premium or Team). |
| @v0-sdk/react | 0.5.0 | Headless React renderer for v0 content | Renders v0-generated components. Peer-requires `react: "^18.0.0 \|\| >=19.2.1"` -- compatible with React 19.2.4. |
### UI / Design
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| shadcn/ui (CLI: shadcn) | 4.1.1 | UI component library | Copy-paste components built on Radix UI. Dark theme support via CSS variables. Not an npm dependency -- components are copied into the project via CLI. |
| Tailwind CSS | 4.2.2 | Utility-first CSS | **v4 is a major rewrite** from v3. Uses CSS-based config (`@import "tailwindcss"`) instead of `tailwind.config.js`. Requires `@tailwindcss/postcss@4.2.2`. |
| @tailwindcss/postcss | 4.2.2 | PostCSS integration for Tailwind v4 | Required by Tailwind v4's new architecture. Replaces old `tailwindcss` PostCSS plugin. |
| Recharts | 3.8.1 | Security score charts, OWASP distribution | React-based charting. Supports React 19. Good for gauge charts, bar charts, radar charts. |
| Mermaid | 11.13.0 | Data flow and attack path diagrams | **Browser-only** -- requires DOM. Must use `'use client'` + dynamic import in Next.js. 21 dependencies (d3, cytoscape, etc.) -- heavy bundle, lazy-load aggressively. |
| lucide-react | 1.7.0 | Icons (shadcn default) | Tree-shakeable icon library, pairs with shadcn/ui. |
| clsx | 2.1.1 | Conditional class names | shadcn/ui utility dependency. |
| tailwind-merge | 3.5.0 | Tailwind class deduplication | shadcn/ui utility dependency. |
| class-variance-authority | 0.7.1 | Component variant management | shadcn/ui utility dependency. |
### Code Display
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| shiki | 4.0.2 | Syntax highlighting | Modern, VSCode-engine highlighter. Supports server-side rendering (unlike Prism/highlight.js which need browser). Use for code snippets in reports. |
| react-diff-viewer-continued | 4.2.0 | Before/after code diffs | Side-by-side and unified diff views. Supports React 19. For showing vulnerability fixes in reports. |
### Authentication
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| next-auth | 4.24.13 | GitHub OAuth for dashboard | Stable v4 release. Supports Next.js ^16, React ^19. Peer-requires `@auth/core@0.34.3`. Use GitHub OAuth provider for dashboard login. |
### Data Storage
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @upstash/redis | 1.37.0 | Audit result storage, dashboard data | HTTP REST-based Redis client. Serverless-optimized (no TCP connection management). Stores audit JSON keyed by `{owner}/{repo}/pr/{number}`. |
### GitHub API
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @octokit/rest | 22.0.1 | GitHub REST API client | For PR branch operations, file commits, repo metadata. Note: @chat-adapter/github bundles this internally for its own use, but install separately for direct API calls (auto-fix commits, branch operations). |
### Configuration Parsing
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| yaml | 2.8.3 | Parse .clawguard/config.yml and policies.yml | Lightweight YAML parser. Handles YAML 1.2 spec. Zero dependencies. |
## Critical Compatibility Notes and Gotchas
### 1. Redis State Adapter Uses TCP, Not HTTP REST (CRITICAL)
- `@upstash/redis` (HTTP REST) for audit data storage -- serverless-optimized, uses `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `redis@5` (TCP) for Chat SDK state -- uses standard `REDIS_URL` (e.g., `redis://...`)
- REST URL/token for `@upstash/redis` (audit storage)
- Standard Redis URL for `@chat-adapter/state-redis` (chat state)
### 2. Mermaid Is Browser-Only (CRITICAL for SSR)
### 3. Tailwind CSS v4 Is a Major Rewrite (IMPORTANT)
- Install: `npm install tailwindcss @tailwindcss/postcss postcss`
- Config: `postcss.config.mjs` with `{ plugins: { "@tailwindcss/postcss": {} } }`
- CSS: `@import "tailwindcss";` instead of `@tailwind base; @tailwind components; @tailwind utilities;`
- Theme: CSS custom properties (`@theme { --color-primary: ... }`) instead of `theme.extend` in config
### 4. Zod 4 API Differences (MODERATE)
- `z.object()` now uses `z.interface()` for TypeScript interface-like behavior
- Error formatting changed
- Some utility types renamed
### 5. @vercel/sandbox Requires OIDC Token (IMPORTANT for Local Dev)
### 6. @chat-adapter/github Bundles Octokit (MINOR)
### 7. v0 SDK Requires Paid Plan (BUSINESS)
### 8. NextAuth v4 Ships with Preact (MINOR)
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 | Next.js 15 (15.5.14) | v16 is stable, better React 19 support, latest App Router features. v15 would also work if v16 causes issues. |
| Auth | next-auth 4.24.13 | Auth.js v5 (next-auth@5-beta) | v5 is still beta (5.0.0-beta.30). v4 is battle-tested, supports Next.js 16 via peer deps. |
| Redis Client | @upstash/redis | ioredis | Upstash REST is serverless-native. ioredis requires TCP connections. For the Chat SDK state adapter, TCP is required regardless. |
| Syntax Highlight | shiki | react-syntax-highlighter | shiki supports SSR, uses VSCode grammar, better theme support. react-syntax-highlighter is older and heavier. |
| Diff Viewer | react-diff-viewer-continued | diff (text only) | Need visual diff display, not just text. react-diff-viewer-continued provides React components with syntax highlighting. |
| Charts | Recharts | Victory, Nivo | Recharts is lighter, React 19 compatible, well-documented. Nivo is heavier. Victory has less community adoption. |
| YAML Parser | yaml | js-yaml | `yaml` package supports YAML 1.2, has TypeScript types, actively maintained. js-yaml is older (YAML 1.1). |
| Icons | lucide-react | heroicons, react-icons | lucide-react is shadcn/ui's default. Tree-shakeable. Consistent with the design system. |
## Environment Variables Required
# GitHub App (for Chat SDK GitHub Adapter)
# Redis (Upstash - two connection modes)
# Vercel AI Gateway
# Auto-provided via OIDC on Vercel deployments
# For local dev: vercel link && vercel env pull
# v0 Platform API
# NextAuth
# GitHub OAuth (for dashboard login via NextAuth)
## Installation
# Core framework
# AI / Agent
# Chat / Bot
# Code Analysis
# Report Generation
# UI
# Code Display
# Auth
# Data
# GitHub API
# Config
# Tailwind CSS
# Dev dependencies
## Package Dependency Graph (Simplified)
## Sources
- npm registry (all version numbers verified 2026-03-27)
- Vercel Sandbox SDK Reference: https://vercel.com/docs/vercel-sandbox/sdk-reference
- v0 Platform API docs: https://v0.app/docs/api/platform/overview
- Chat SDK docs: https://chat-sdk.dev/docs
- Chat SDK GitHub adapter: https://chat-sdk.dev/docs/adapters/github
- AI SDK docs: https://ai-sdk.dev/docs
- AI SDK Agents: https://ai-sdk.dev/docs/foundations/agents
- Auth.js / NextAuth: https://authjs.dev/getting-started
- Tailwind CSS v4 Next.js guide: https://tailwindcss.com/docs/installation/framework-guides/nextjs
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
