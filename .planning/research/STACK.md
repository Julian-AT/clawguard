# Technology Stack

**Project:** ClawGuard - AI-Powered GitHub PR Security Review Agent
**Researched:** 2026-03-27
**Overall Confidence:** HIGH (all packages verified via npm registry; official docs consulted for key APIs)

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

**Problem:** `@chat-adapter/state-redis` depends on `redis@^5.11.0` (node-redis), which uses **TCP connections**. The project also uses `@upstash/redis` which uses **HTTP REST**. These are fundamentally different protocols.

**Impact:** You need TWO Redis connection strategies:
- `@upstash/redis` (HTTP REST) for audit data storage -- serverless-optimized, uses `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `redis@5` (TCP) for Chat SDK state -- uses standard `REDIS_URL` (e.g., `redis://...`)

**Solution:** Upstash Redis supports both protocols. Configure Upstash with:
- REST URL/token for `@upstash/redis` (audit storage)
- Standard Redis URL for `@chat-adapter/state-redis` (chat state)

Both are available in the Upstash dashboard. The TCP connection works on Vercel but has cold-start overhead. For a hackathon, this is acceptable. For production, consider connection pooling or switching to `@chat-adapter/state-memory` for dev.

**Confidence:** HIGH (verified via npm dependency trees)

### 2. Mermaid Is Browser-Only (CRITICAL for SSR)

**Problem:** Mermaid requires DOM access and cannot render on the server. In Next.js App Router, all components are Server Components by default.

**Solution:**
```tsx
// components/mermaid-diagram.tsx
'use client';
import dynamic from 'next/dynamic';
const MermaidRenderer = dynamic(() => import('./mermaid-renderer'), { ssr: false });
```

Also use `next/dynamic` with `{ ssr: false }` to avoid SSR hydration mismatches. Mermaid's 21 dependencies (d3, cytoscape, etc.) add ~500KB+ to the client bundle -- always lazy-load.

**Confidence:** HIGH (verified Mermaid has no SSR exports)

### 3. Tailwind CSS v4 Is a Major Rewrite (IMPORTANT)

**Problem:** Tailwind v4 replaces `tailwind.config.js` with CSS-based configuration. Most tutorials, shadcn/ui setup guides, and AI-generated code still reference v3 patterns.

**What changed:**
- Install: `npm install tailwindcss @tailwindcss/postcss postcss`
- Config: `postcss.config.mjs` with `{ plugins: { "@tailwindcss/postcss": {} } }`
- CSS: `@import "tailwindcss";` instead of `@tailwind base; @tailwind components; @tailwind utilities;`
- Theme: CSS custom properties (`@theme { --color-primary: ... }`) instead of `theme.extend` in config

**Impact on shadcn/ui:** The `shadcn` CLI v4.1.1 supports Tailwind v4. Run `npx shadcn@latest init` and it will generate v4-compatible configuration.

**Confidence:** HIGH (verified via official Tailwind docs)

### 4. Zod 4 API Differences (MODERATE)

**Problem:** Zod 4 is a major version with some API changes from Zod 3. The AI SDK requires `^3.25.76 || ^4.1.8`.

**Key changes in Zod 4:**
- `z.object()` now uses `z.interface()` for TypeScript interface-like behavior
- Error formatting changed
- Some utility types renamed

**Recommendation:** Use Zod 4.3.6 (latest). The AI SDK's `zodSchema()` helper handles the version bridging. If you encounter issues, the AI SDK also supports `jsonSchema()` as a fallback.

**Confidence:** MEDIUM (Zod 4 is relatively new; some edge cases may surface)

### 5. @vercel/sandbox Requires OIDC Token (IMPORTANT for Local Dev)

**Problem:** The sandbox SDK authenticates via Vercel OIDC tokens, which are auto-available in Vercel deployments but not locally.

**Solution for local dev:**
```bash
vercel link    # Link project
vercel env pull # Pull OIDC token to .env.local
```

Alternatively, use access tokens for non-Vercel environments. The sandbox has a 5-minute default timeout -- extend via `sandbox.extendTimeout()` for large repos.

**Confidence:** HIGH (verified via official SDK docs)

### 6. @chat-adapter/github Bundles Octokit (MINOR)

**Problem:** `@chat-adapter/github` bundles `@octokit/rest@^22.0.1` and `@octokit/auth-app@^8.2.0` as direct dependencies. Installing `@octokit/rest` separately could cause version conflicts.

**Solution:** Pin `@octokit/rest@22.0.1` (same version the adapter uses). Since you need Octokit for direct API calls (auto-fix commits), this is unavoidable. npm/pnpm will deduplicate if versions match.

**Confidence:** HIGH (verified via dependency tree)

### 7. v0 SDK Requires Paid Plan (BUSINESS)

**Problem:** The v0 Platform API requires a Premium or Team plan on v0.dev and an API key.

**Environment variable:** `V0_API_KEY`

**Fallback strategy:** If v0 API is unavailable (rate limits, plan issues), pre-build report templates as static React components. Use v0 SDK for refinement/enhancement, not as a hard dependency for basic report rendering.

**Confidence:** HIGH (verified via official v0 docs)

### 8. NextAuth v4 Ships with Preact (MINOR)

**Problem:** `next-auth@4.24.13` bundles `preact` and `preact-render-to-string` as dependencies for its built-in pages. This adds ~15KB to the server bundle but does not affect client bundles if you use custom pages.

**Solution:** Use custom sign-in/sign-out pages to avoid the Preact overhead entirely.

**Confidence:** HIGH (verified via dependency tree)

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

```bash
# GitHub App (for Chat SDK GitHub Adapter)
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=           # PEM format, multiline
GITHUB_WEBHOOK_SECRET=
GITHUB_INSTALLATION_ID=       # Optional for multi-tenant
GITHUB_BOT_USERNAME=clawguard # For @mention detection

# Redis (Upstash - two connection modes)
UPSTASH_REDIS_REST_URL=       # For @upstash/redis (HTTP REST)
UPSTASH_REDIS_REST_TOKEN=     # For @upstash/redis (HTTP REST)
REDIS_URL=                     # For @chat-adapter/state-redis (TCP)

# Vercel AI Gateway
# Auto-provided via OIDC on Vercel deployments
# For local dev: vercel link && vercel env pull

# v0 Platform API
V0_API_KEY=                    # Requires Premium or Team plan

# NextAuth
NEXTAUTH_URL=                  # e.g., http://localhost:3000
NEXTAUTH_SECRET=               # Random secret for JWT signing

# GitHub OAuth (for dashboard login via NextAuth)
GITHUB_CLIENT_ID=              # From GitHub OAuth App (separate from GitHub App)
GITHUB_CLIENT_SECRET=
```

## Installation

```bash
# Core framework
npm install next@16.2.1 react@19.2.4 react-dom@19.2.4

# AI / Agent
npm install ai@6.0.141 zod@4.3.6

# Chat / Bot
npm install chat@4.23.0 @chat-adapter/github@4.23.0 @chat-adapter/state-redis@4.23.0

# Code Analysis
npm install @vercel/sandbox@1.9.0

# Report Generation
npm install v0-sdk@0.16.4 @v0-sdk/react@0.5.0

# UI
npm install recharts@3.8.1 mermaid@11.13.0 lucide-react@1.7.0
npm install clsx@2.1.1 tailwind-merge@3.5.0 class-variance-authority@0.7.1

# Code Display
npm install shiki@4.0.2 react-diff-viewer-continued@4.2.0

# Auth
npm install next-auth@4.24.13 @auth/core@0.34.3

# Data
npm install @upstash/redis@1.37.0

# GitHub API
npm install @octokit/rest@22.0.1

# Config
npm install yaml@2.8.3

# Tailwind CSS
npm install tailwindcss@4.2.2 @tailwindcss/postcss@4.2.2 postcss

# Dev dependencies
npm install -D typescript@6.0.2 @types/react @types/react-dom @types/node
```

Note: shadcn/ui components are added via CLI, not npm:
```bash
npx shadcn@4.1.1 init
npx shadcn@4.1.1 add button card badge tabs accordion dialog dropdown-menu
```

## Package Dependency Graph (Simplified)

```
next@16.2.1
  +-- react@19.2.4
  +-- react-dom@19.2.4

ai@6.0.141
  +-- @ai-sdk/gateway@3.0.83
  |     +-- @vercel/oidc@3.1.0
  +-- zod@4.3.6 (peer)

chat@4.23.0
  +-- @chat-adapter/github@4.23.0
  |     +-- @octokit/auth-app@^8.2.0
  |     +-- @octokit/rest@^22.0.1
  +-- @chat-adapter/state-redis@4.23.0
        +-- redis@^5.11.0

@vercel/sandbox@1.9.0
  +-- @vercel/oidc@3.2.0

next-auth@4.24.13
  +-- @auth/core@0.34.3 (peer)

@upstash/redis@1.37.0 (standalone, HTTP REST)
```

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
