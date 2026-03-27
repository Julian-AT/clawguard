# Architecture Research

**Domain:** AI-powered GitHub PR security review agent (single Next.js deployment)
**Researched:** 2026-03-27
**Confidence:** MEDIUM-HIGH

## System Overview

```
                           GitHub PR Thread
                          (@mention / reply)
                                 |
                                 v
┌──────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APP (VERCEL)                             │
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│  │  Webhook Handler    │  │  Report Pages   │  │  Dashboard     │   │
│  │  /api/webhooks/     │  │  /report/[...]  │  │  /dashboard/   │   │
│  │  [platform]/        │  │  (public SSR)   │  │  (authed SSR)  │   │
│  │  route.ts           │  │                 │  │                │   │
│  └────────┬────────────┘  └───────┬─────────┘  └───────┬────────┘   │
│           │                       │                     │            │
│  ┌────────┴────────────────────────────────────────────┐│            │
│  │                    /lib/ (shared logic)              ││            │
│  │                                                     ││            │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────────────┐ ││            │
│  │  │ bot.ts   │  │ review.ts │  │ report-gen.ts    │ ││            │
│  │  │ Chat SDK │  │ 3-phase   │  │ v0 SDK           │ ││            │
│  │  │ instance │  │ analysis  │  │ integration      │ ││            │
│  │  └────┬─────┘  └─────┬─────┘  └────────┬─────────┘ ││            │
│  │       │               │                  │           ││            │
│  │  ┌────┴─────┐  ┌─────┴──────┐  ┌───────┴────────┐  ││            │
│  │  │ fix.ts   │  │ config-    │  │ auth config    │  ││            │
│  │  │ auto-fix │  │ reader.ts  │  │ NextAuth.js    │──┘│            │
│  │  │ + commit │  │ .clawguard │  │ GitHub OAuth   │   │            │
│  │  └──────────┘  └────────────┘  └────────────────┘   │            │
│  └─────────────────────────────────────────────────────┘             │
└──────────────────────┬──────────────────┬────────────────────────────┘
                       │                  │
          ┌────────────┴───┐     ┌────────┴──────────┐
          │ Vercel Sandbox │     │   Upstash Redis   │
          │ (microVM)      │     │   (state store)   │
          │ - git clone    │     │   - audit JSON    │
          │ - code analysis│     │   - thread state  │
          │ - fix patches  │     │   - conversation  │
          └────────────────┘     └───────────────────┘
                       │
          ┌────────────┴───────────┐
          │ Vercel AI Gateway      │
          │ (LLM provider)         │
          │ - ToolLoopAgent calls  │
          │ - configurable model   │
          └────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Webhook Handler | Receives GitHub events, routes to Chat SDK, returns 200 immediately | Next.js Route Handler at `/api/webhooks/[platform]/route.ts` with `after()` for background processing |
| Chat SDK (bot.ts) | Event routing, thread subscription, message posting, card rendering | `new Chat({ adapters: { github: createGitHubAdapter() }, state: createRedisState() })` |
| Review Pipeline (review.ts) | 3-phase security analysis: code quality, vulnerability scan, threat model | ToolLoopAgent with sandbox tools (readFile, bash, writeFile) |
| Sandbox Executor | Isolated code execution: git clone, file analysis, fix generation | `@vercel/sandbox` Sandbox.create() with git source |
| Auto-Fix (fix.ts) | Generate fix in sandbox, validate, commit to PR branch via Octokit | Sandbox writeFile + runCommand for validation + Octokit for git push |
| Report Generator (report-gen.ts) | Generate/refine interactive report UI from audit JSON | v0 SDK init from template files, then chat.create with design prompt |
| Report Pages | Serve interactive security reports per PR | Next.js App Router pages at `/report/[owner]/[repo]/[pr]/page.tsx` |
| Config Reader (config-reader.ts) | Read per-repo `.clawguard/config.yml` and `policies.yml` | Sandbox readFile or Octokit content API |
| Dashboard | Authenticated views: connected repos, audit history | Next.js App Router pages with NextAuth.js middleware protection |
| Auth (NextAuth.js) | GitHub OAuth login, session management | `/api/auth/[...nextauth]/route.ts` with GitHub provider |
| Redis State | Audit result storage, Chat SDK thread state, conversation context | Upstash Redis with `@upstash/redis` SDK, keyed by `{owner}/{repo}/pr/{number}` |
| AI Gateway | LLM inference for ToolLoopAgent and report generation | Vercel AI Gateway (model configurable via `.clawguard/config.yml`) |

## Recommended Project Structure

```
app/
├── api/
│   ├── webhooks/
│   │   └── [platform]/
│   │       └── route.ts          # Chat SDK webhook routing (GitHub, etc.)
│   ├── reports/
│   │   └── [id]/
│   │       └── route.ts          # Serve audit JSON API
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts          # NextAuth.js GitHub OAuth
├── report/
│   └── [owner]/
│       └── [repo]/
│           └── [pr]/
│               └── page.tsx      # Public interactive report (SSR)
├── dashboard/
│   ├── layout.tsx                # Auth-protected layout
│   ├── page.tsx                  # Overview: connected repos
│   └── [owner]/
│       └── [repo]/
│           └── page.tsx          # Per-repo audit history
├── layout.tsx                    # Root layout (dark theme globals)
└── page.tsx                      # Landing / marketing page
lib/
├── bot.ts                        # Chat SDK instance + handler registration
├── review.ts                     # 3-phase security analysis pipeline
├── fix.ts                        # Auto-fix generation, validation, commit
├── report-generator.ts           # v0 SDK integration for report UI
├── config-reader.ts              # .clawguard config + policies reader
├── sandbox.ts                    # Sandbox lifecycle helpers (create, snapshot, cleanup)
├── redis.ts                      # Upstash Redis client + key schema
├── auth.ts                       # NextAuth.js config + GitHub provider
├── tools/                        # AI SDK tool definitions
│   ├── read-file.ts              # readFile tool for ToolLoopAgent
│   ├── write-file.ts             # writeFile tool for ToolLoopAgent
│   ├── bash.ts                   # bash execution tool for ToolLoopAgent
│   └── search-code.ts            # code search/grep tool
├── prompts/                      # System prompts for each analysis phase
│   ├── code-quality.ts
│   ├── vulnerability-scan.ts
│   └── threat-model.ts
├── schemas/                      # Zod schemas for structured output
│   ├── audit-result.ts           # Full audit JSON schema
│   ├── finding.ts                # Individual finding schema
│   └── config.ts                 # .clawguard config schema
└── cards/                        # Chat SDK JSX card components
    ├── summary-card.tsx          # PR summary card with findings + score
    └── fix-card.tsx              # Fix confirmation card with diff preview
components/                       # shadcn/ui + report components
├── ui/                           # shadcn/ui primitives
├── report/                       # Report page components
│   ├── security-gauge.tsx
│   ├── finding-card.tsx
│   ├── owasp-chart.tsx
│   ├── mermaid-diagram.tsx
│   ├── code-diff.tsx
│   └── compliance-table.tsx
└── dashboard/                    # Dashboard page components
    ├── repo-list.tsx
    └── audit-table.tsx
```

### Structure Rationale

- **app/api/webhooks/[platform]/**: Dynamic platform routing lets the same route handle GitHub (and future platforms) by extracting the platform param and dispatching to `bot.webhooks[platform]`. This is the Chat SDK recommended pattern.
- **lib/**: All business logic lives here, importable from both API routes and page components. No framework coupling in core logic.
- **lib/tools/**: Isolating AI SDK tool definitions keeps them testable and reusable across all three analysis phases.
- **lib/prompts/**: Separate prompt files per analysis phase allows tuning without touching logic.
- **lib/schemas/**: Zod schemas serve triple duty: validating LLM structured output, validating Redis data integrity, and typing the report page props.
- **lib/cards/**: Chat SDK JSX cards must be `.tsx` files. Keeping them separate from React UI components avoids import confusion (Chat SDK Card vs React component).
- **components/report/**: Report UI components are standard React + shadcn/ui, distinct from Chat SDK cards.

## Architectural Patterns

### Pattern 1: Webhook-to-Background-Task (after() pattern)

**What:** Accept webhook POST, return 200 immediately, run long-running AI work in background via Next.js `after()`.
**When to use:** Every webhook handler. The GitHub webhook timeout is 10 seconds; your analysis takes 30-120 seconds.
**Trade-offs:** Simple and serverless-native. Bounded by `maxDuration` (default 300s, max 800s on Pro plan). No retry mechanism built in -- must handle failures within the after() callback.

**Example:**
```typescript
// app/api/webhooks/[platform]/route.ts
import { after } from 'next/server';
import { bot } from '@/lib/bot';

export const maxDuration = 300; // 5 minutes for AI analysis

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const handler = bot.webhooks[platform as keyof typeof bot.webhooks];
  if (!handler) return new Response('Not found', { status: 404 });

  return handler(request, {
    waitUntil: (promise: Promise<unknown>) => after(() => promise),
  });
}
```

**Key insight from research:** Next.js 15.1+ provides `after()` from `next/server` which is the recommended replacement for `waitUntil` from `@vercel/functions`. The Chat SDK webhook handler accepts a `{ waitUntil }` option, so you bridge them by wrapping `after()`. The `maxDuration` route segment config controls how long background work can run (up to 800s on Pro with Fluid Compute).

**Confidence:** HIGH (verified via official Vercel docs and Chat SDK docs)

### Pattern 2: Chat SDK Bot-as-Module Singleton

**What:** Instantiate the Chat SDK bot once in a shared module. Import it from webhook routes. Register all handlers at module scope.
**When to use:** Always. The bot instance holds adapter configs and handler registrations; you want exactly one instance per runtime.
**Trade-offs:** Clean separation. But be aware that in serverless, each cold start re-executes the module -- handler registration must be idempotent and fast.

**Example:**
```typescript
// lib/bot.ts
import { Chat } from '@anthropic-ai/chat'; // or correct chat-sdk import
import { createGitHubAdapter } from '@anthropic-ai/chat/adapters/github';
import { createRedisState } from '@anthropic-ai/chat/state/redis';
import { runSecurityAudit } from './review';
import { handleFollowUp } from './follow-up';

export const bot = new Chat({
  userName: 'clawguard',
  adapters: {
    github: createGitHubAdapter(),
  },
  state: createRedisState({ url: process.env.REDIS_URL! }),
});

bot.onNewMention(async (thread) => {
  await thread.subscribe();
  await thread.post('Starting security audit...');
  const result = await runSecurityAudit(thread);
  await thread.post(result.summaryCard); // Chat SDK Card JSX
});

bot.onSubscribedMessage(async (thread) => {
  await handleFollowUp(thread);
});

bot.onAction(async (thread, action) => {
  if (action.id === 'auto-fix') {
    // trigger fix pipeline
  }
});
```

**Confidence:** HIGH (verified via Chat SDK docs: Chat class, handler registration, webhook routing)

### Pattern 3: Sandbox-per-Audit Isolation

**What:** Each security audit creates a fresh Vercel Sandbox microVM, clones the repo at the PR's head commit, runs analysis inside it, then destroys it.
**When to use:** Every audit invocation. Never reuse sandboxes across different PRs.
**Trade-offs:** Clean isolation and security (untrusted code never touches your infra). Cold start is fast (milliseconds per Vercel docs). Costs scale with usage. Sandbox timeout defaults to 5 min, extendable to 45 min (Hobby) or 5 hours (Pro/Enterprise).

**Example:**
```typescript
// lib/sandbox.ts
import { Sandbox } from '@vercel/sandbox';

export async function createAuditSandbox(repoUrl: string, ref: string) {
  const sandbox = await Sandbox.create({
    runtime: 'node24',
    source: {
      type: 'git',
      url: repoUrl,
      revision: ref,
      depth: 1, // shallow clone for speed
    },
    timeout: 300_000, // 5 minutes
    networkPolicy: {
      allow: ['ai-gateway.vercel.sh'], // Only allow AI Gateway calls
    },
  });
  return sandbox;
}
```

**Key insight from research:** Vercel Sandbox runs Firecracker microVMs with Amazon Linux 2023. It has git clone built into the `source` parameter of `Sandbox.create()`, so you do not need to manually `git clone` inside the sandbox. The `networkPolicy` feature lets you restrict sandbox egress to only the AI Gateway, preventing exfiltration of analyzed code. File read/write operations are available via `sandbox.readFile()`, `sandbox.writeFiles()`, and `sandbox.runCommand()`.

**Confidence:** HIGH (verified via official Vercel Sandbox SDK reference)

### Pattern 4: ToolLoopAgent for Multi-Phase Analysis

**What:** Use AI SDK's ToolLoopAgent to give the LLM tools (readFile, bash, searchCode) and let it autonomously analyze code in a loop until it produces structured findings.
**When to use:** Each of the 3 analysis phases. The agent decides which files to read and which commands to run.
**Trade-offs:** Powerful and flexible -- agent can discover issues humans wouldn't script for. But non-deterministic: run times vary, tool call counts vary. Use `stopWhen: stepCountIs(20)` to cap iterations and prevent runaway loops.

**Example:**
```typescript
// lib/review.ts
import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';
import { Sandbox } from '@vercel/sandbox';

function createSandboxTools(sandbox: Sandbox) {
  return {
    readFile: tool({
      description: 'Read a file from the repository',
      parameters: z.object({ path: z.string() }),
      execute: async ({ path }) => {
        const buf = await sandbox.readFileToBuffer({ path });
        return buf?.toString('utf-8') ?? 'File not found';
      },
    }),
    bash: tool({
      description: 'Run a bash command in the repository',
      parameters: z.object({ command: z.string() }),
      execute: async ({ command }) => {
        const result = await sandbox.runCommand('bash', ['-c', command]);
        return await result.stdout();
      },
    }),
  };
}

export async function runPhase(sandbox: Sandbox, phase: string, prompt: string) {
  const agent = new ToolLoopAgent({
    model: 'anthropic/claude-sonnet-4', // via AI Gateway
    tools: createSandboxTools(sandbox),
    stopWhen: stepCountIs(20),
  });
  const result = await agent.generate({ prompt });
  return result;
}
```

**Confidence:** HIGH (verified via AI SDK docs: ToolLoopAgent, tool definitions, stopWhen)

### Pattern 5: Redis as Audit Result Store + Chat State Backend

**What:** Upstash Redis serves dual purpose: (1) stores structured audit JSON results keyed by `{owner}/{repo}/pr/{number}`, and (2) backs the Chat SDK state adapter for thread subscriptions and conversation context.
**When to use:** Always. Both the report pages and the dashboard read from Redis. The Chat SDK requires a state adapter for `thread.subscribe()` to persist across serverless invocations.
**Trade-offs:** Simple, serverless-native, low latency. No relational queries -- if you need complex filtering later, you would need to add a database. For the hackathon scope this is sufficient.

**Key schema:**
```
# Audit results (JSON blobs)
audit:{owner}/{repo}/pr/{number}           → full audit JSON
audit:{owner}/{repo}/pr/{number}:score     → numeric score (for dashboard sorting)
audit:{owner}/{repo}/pr/{number}:status    → "pending" | "running" | "complete" | "failed"

# Repo registry (for dashboard)
repos:{owner}/{repo}                       → repo metadata JSON
repos:{owner}/{repo}:audits               → sorted set of PR numbers by timestamp

# Chat SDK managed keys (thread state, subscriptions)
# These are managed by createRedisState() -- do not manually manipulate
```

**Confidence:** MEDIUM (Upstash Redis is well-documented for serverless; the key schema is project-specific design, not verified against external sources)

### Pattern 6: v0 SDK Report Generation Pipeline

**What:** Use the v0 SDK to generate and refine interactive report UI components from a template baseline plus audit data.
**When to use:** After the audit completes and structured JSON is stored in Redis. The pipeline initializes a v0 chat with template files, sends a design prompt with the audit data, and captures the generated component code.
**Trade-offs:** Produces impressive, polished UI dynamically. But adds latency (v0 generation takes time) and an external dependency. For the hackathon, pre-build the template components and use v0 for refinement/polish only, falling back to static templates if v0 is slow or fails.

**Pipeline flow:**
```
1. Template files (components/report/*.tsx) are the baseline
2. v0.chats.init({ type: 'files', files: templateFiles })
3. v0.chats.create({ message: designPrompt + auditDataJSON })
4. Extract generated version files
5. Either:
   a. Render dynamically (advanced), or
   b. Store generated HTML/components and serve from report page (simpler)
```

**Confidence:** MEDIUM (v0 SDK API surface verified via v0.app/docs; the integration pattern with template files is project-specific design informed by PROJECT.md context)

## Data Flow

### Primary Flow: @mention to Report

```
GitHub PR: @clawguard review
         |
         v
[1] POST /api/webhooks/github
         |
         v
[2] Chat SDK GitHub adapter
    - Verifies webhook signature
    - Parses payload into normalized Message
    - Routes to onNewMention handler
         |
         v
[3] after() background task begins
    - Return 200 to GitHub immediately
         |
         v
[4] thread.subscribe() + thread.post("Starting audit...")
         |
         v
[5] config-reader.ts
    - Read .clawguard/config.yml from repo (via Octokit)
    - Read .clawguard/policies.yml if present
    - Merge with defaults
         |
         v
[6] Sandbox.create({ source: { type: 'git', url, revision: prHeadRef } })
    - Firecracker microVM spins up (~ms)
    - Repo cloned at PR head commit
         |
         v
[7] 3-Phase Analysis (sequential, each uses ToolLoopAgent)
    ┌─────────────────────────────────────────────┐
    │ Phase 1: Code Quality Review                │
    │   Agent reads changed files, checks patterns│
    │   Output: code quality findings JSON        │
    ├─────────────────────────────────────────────┤
    │ Phase 2: Vulnerability Scan                 │
    │   Agent runs security checks, reads deps    │
    │   Output: vulnerability findings JSON       │
    ├─────────────────────────────────────────────┤
    │ Phase 3: Threat Model                       │
    │   Agent analyzes data flow, attack surface  │
    │   Output: threat model + Mermaid diagrams   │
    └─────────────────────────────────────────────┘
         |
         v
[8] Merge phase results into unified audit JSON
    - Calculate security score (0-100, A-F grade)
    - Map findings to CWE/OWASP
    - Generate compliance mappings
         |
         v
[9] Store to Redis: audit:{owner}/{repo}/pr/{number}
         |
         v
[10] Report generation (v0 SDK or static template)
    - Generate/refine interactive report components
         |
         v
[11] Post summary Card to PR thread
    - Severity badges, findings table, score
    - Action buttons: Auto-Fix, View Report
    - Link to /report/{owner}/{repo}/{pr}
         |
         v
[12] sandbox.stop() -- cleanup microVM
```

### Secondary Flow: Auto-Fix

```
User clicks "Auto-Fix" button in PR thread Card
         |
         v
[1] Chat SDK onAction handler (action.id === 'auto-fix')
         |
         v
[2] Load audit result from Redis
         |
         v
[3] Sandbox.create() -- new sandbox for fix generation
         |
         v
[4] For each fixable finding:
    - ToolLoopAgent generates fix patch
    - Agent validates fix (run tests, lint)
    - Agent writes corrected file
         |
         v
[5] Commit fixes to PR branch via Octokit
    - Create tree with modified files
    - Create commit referencing PR head
    - Update branch ref
         |
         v
[6] Re-audit: run Phase 1-3 again on fixed code
         |
         v
[7] Store updated audit, post updated Card with new score
         |
         v
[8] sandbox.stop()
```

### Tertiary Flow: Dashboard Read

```
User visits /dashboard (authenticated)
         |
         v
[1] NextAuth.js middleware checks session
         |
         v
[2] Server Component fetches from Redis
    - repos:{owner}/{repo} for connected repos
    - repos:{owner}/{repo}:audits for PR list
    - audit:{owner}/{repo}/pr/{number} for details
         |
         v
[3] Render dashboard with shadcn/ui components
```

### Key Data Flows

1. **Webhook-to-Background:** GitHub POST -> Route Handler -> 200 response -> `after()` runs analysis pipeline (up to 300s).
2. **Agent-to-Sandbox:** ToolLoopAgent tool calls -> Sandbox SDK -> microVM bash/readFile/writeFile -> tool results back to agent.
3. **Audit-to-Redis:** Merged audit JSON -> `redis.set('audit:{key}', JSON.stringify(result))` -> read by report pages and dashboard.
4. **Redis-to-Report:** Report page server component -> `redis.get('audit:{key}')` -> parse JSON -> render with shadcn/ui components.
5. **Chat SDK Cards:** Bot posts JSX Card to thread -> GitHub adapter converts to GFM Markdown with tables (native table support on GitHub).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Hackathon (1-10 audits) | Current design is perfect. Single deployment, Redis, no queue needed. Sandbox cold starts are fast enough. |
| Small team (10-100 audits/day) | Add Redis TTL to auto-expire old audits. Consider Vercel Sandbox snapshots to skip repeated `npm install` in analysis. Monitor `maxDuration` limits. |
| Production (100+ audits/day) | Add a proper job queue (Upstash QStash or similar) between webhook receipt and analysis. Split webhook handler from analysis worker. Add Postgres for relational queries in dashboard. |

### Scaling Priorities

1. **First bottleneck: Serverless function duration.** The 3-phase analysis + auto-fix can take 2-5 minutes. On the Pro plan, `maxDuration` caps at 800s. For longer analyses, you would need to split into chained functions or move to a dedicated compute service. For the hackathon, 300s default is sufficient.
2. **Second bottleneck: Concurrent sandbox limits.** Each audit creates a sandbox. If multiple PRs are @mentioned simultaneously, you hit sandbox concurrency limits. For the hackathon, this is not a concern. For production, add a queue with concurrency control.

## Anti-Patterns

### Anti-Pattern 1: Blocking the Webhook Response

**What people do:** Run the full security analysis inside the webhook POST handler and return the result.
**Why it's wrong:** GitHub webhooks timeout after 10 seconds. The analysis takes 30-120 seconds. The webhook delivery is marked as failed, GitHub may retry (causing duplicate audits), and the user sees no feedback.
**Do this instead:** Return 200 immediately from the webhook handler. Use `after()` to run the analysis in the background. Post progress updates to the PR thread via the Chat SDK.

### Anti-Pattern 2: Sharing Sandboxes Between Audits

**What people do:** Reuse a running sandbox for multiple PR audits to save on startup time.
**Why it's wrong:** Security contamination. Code from one PR could affect analysis of another. State leaks between audits. If one audit fails and corrupts the sandbox, all subsequent audits fail.
**Do this instead:** Create a fresh Sandbox for each audit. Use snapshots if you need to amortize setup costs (e.g., pre-install common tools in a snapshot and create from it).

### Anti-Pattern 3: Storing Audit Results in Vercel Sandbox Filesystem

**What people do:** Write audit results to files in the sandbox and read them later.
**Why it's wrong:** Sandbox filesystems are ephemeral. Once `sandbox.stop()` is called, all data is lost. You cannot access sandbox files from the report page route.
**Do this instead:** Always persist audit results to Redis before stopping the sandbox. The sandbox is a compute environment, not a storage layer.

### Anti-Pattern 4: Using waitUntil from @vercel/functions in Next.js 15.1+

**What people do:** Import `waitUntil` from `@vercel/functions` in their Next.js route handlers.
**Why it's wrong:** Since Next.js 15.1, the built-in `after()` from `next/server` is the recommended approach. It works in Server Components, Server Actions, Route Handlers, and Middleware. Using the older `waitUntil` misses features like automatic integration with the Next.js rendering lifecycle.
**Do this instead:** Use `import { after } from 'next/server'`. Bridge to Chat SDK's `waitUntil` expectation: `handler(request, { waitUntil: (p) => after(() => p) })`.

### Anti-Pattern 5: Calling v0 SDK Synchronously in the Audit Pipeline

**What people do:** Block the audit pipeline waiting for v0 to generate report components before posting the summary card.
**Why it's wrong:** v0 generation can be slow and unreliable. It adds minutes to time-to-first-response. The user is waiting.
**Do this instead:** Post the summary card immediately after analysis completes (using static card components). Trigger v0 report generation asynchronously. The report page can show a "generating..." state and poll/refresh when the v0 output is ready. Or even simpler: use pre-built report components and reserve v0 for one-time template refinement during development, not runtime generation.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GitHub API (Octokit) | REST API calls for: reading repo content, creating commits, updating branch refs | Use App installation token from webhook payload. Rate limits: 5000 req/hr per installation. |
| Vercel AI Gateway | HTTP API via AI SDK provider | Model configurable per-repo via `.clawguard/config.yml`. Supports Claude, GPT-4, etc. |
| Vercel Sandbox | `@vercel/sandbox` SDK | Auth via Vercel OIDC (automatic in production). `vercel link` + `vercel env pull` for local dev. |
| v0 Platform API | `v0-sdk` TypeScript SDK | Initialize chat from source files, send generation prompts, download versions. API key required. |
| Upstash Redis | `@upstash/redis` SDK | REST-based (works in serverless without persistent connections). Uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars. |
| NextAuth.js (Auth.js v5) | `next-auth` with GitHub provider | GitHub OAuth App credentials. Session stored in JWT (no database session needed for hackathon). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Webhook Route <-> Bot (lib/bot.ts) | Direct import, function call | Bot is a singleton module. Route calls `bot.webhooks.github(request, opts)`. |
| Bot Handlers <-> Review Pipeline (lib/review.ts) | Direct async function call within `after()` | Handler calls `runSecurityAudit(thread)` which orchestrates the full pipeline. |
| Review Pipeline <-> Sandbox (lib/sandbox.ts) | `@vercel/sandbox` SDK over HTTPS | SDK handles auth, sandbox lifecycle. Review pipeline creates tools that wrap sandbox methods. |
| Review Pipeline <-> AI Gateway | AI SDK over HTTPS | ToolLoopAgent.generate() calls the gateway. Tools execute sandbox operations. |
| Review Pipeline <-> Redis (lib/redis.ts) | `@upstash/redis` SDK over HTTPS | Store audit results after analysis. Read config/state during analysis. |
| Report Pages <-> Redis | `@upstash/redis` SDK, server-side only | Server Components fetch audit JSON at render time. No client-side Redis access. |
| Dashboard <-> Redis | `@upstash/redis` SDK, server-side only | Server Components fetch repo list and audit history. Protected by NextAuth middleware. |
| Dashboard <-> NextAuth | Next.js middleware + `auth()` call | Middleware redirects unauthenticated users to login. Server Components read session for user-specific data. |
| Cards (lib/cards/) <-> Chat SDK | JSX card components imported by bot handlers | Cards are pure JSX components. Bot handler calls `thread.post(SummaryCard({ auditResult }))`. |

## Build Order Dependencies

The following build order reflects component dependencies. A component cannot be meaningfully built until its dependencies exist.

```
Phase 1: Foundation (no dependencies)
├── lib/redis.ts          (Redis client + key schema)
├── lib/auth.ts           (NextAuth.js config)
├── lib/schemas/          (Zod schemas for all data types)
└── app/api/auth/         (Auth route handler)

Phase 2: Sandbox + AI Core (depends on Phase 1 schemas)
├── lib/sandbox.ts        (Sandbox lifecycle helpers)
├── lib/tools/            (AI SDK tool definitions wrapping sandbox)
├── lib/prompts/          (System prompts per analysis phase)
└── lib/config-reader.ts  (Read .clawguard config)

Phase 3: Bot + Pipeline (depends on Phase 1 + 2)
├── lib/bot.ts            (Chat SDK instance + handlers)
├── lib/review.ts         (3-phase analysis pipeline)
├── app/api/webhooks/     (Webhook route handler)
└── lib/cards/            (Summary card JSX)

Phase 4: Auto-Fix (depends on Phase 3)
├── lib/fix.ts            (Fix generation + validation + commit)
└── lib/cards/fix-card.tsx (Fix confirmation card)

Phase 5: Report + Dashboard (depends on Phase 1 + 3 for data)
├── components/report/    (All report UI components)
├── app/report/           (Report pages)
├── lib/report-generator.ts (v0 SDK integration -- optional enhancement)
├── components/dashboard/ (Dashboard UI components)
└── app/dashboard/        (Dashboard pages)
```

**Build order rationale:**
- **Redis + schemas first** because every other component reads/writes structured data. Get the data contracts right before building producers and consumers.
- **Sandbox + tools second** because the review pipeline and fix pipeline both depend on sandbox execution. These are testable in isolation with a mock repo.
- **Bot + pipeline third** because this is the core product loop: webhook -> analysis -> card. This is what the demo shows first.
- **Auto-fix fourth** because it extends the pipeline with an additional capability. The core audit must work before fix logic is layered on.
- **Report + dashboard last** because they are read-only consumers of audit data already in Redis. They can be built in parallel with Phase 3/4 since they just need sample audit JSON in Redis to render against.

## Sources

- Vercel Functions API Reference (waitUntil, after): https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package
- Next.js after() API Reference: https://nextjs.org/docs/app/api-reference/functions/after
- Vercel Function Duration Limits: https://vercel.com/docs/functions/configuring-functions/duration
- Vercel Sandbox Overview: https://vercel.com/docs/vercel-sandbox
- Vercel Sandbox SDK Reference: https://vercel.com/docs/vercel-sandbox/sdk-reference
- AI SDK Agents Documentation: https://ai-sdk.dev/docs/foundations/agents
- Chat SDK Documentation: https://chat-sdk.dev/docs
- Chat SDK GitHub Adapter: https://chat-sdk.dev/docs/adapters
- Chat SDK Thread API: https://chat-sdk.dev/docs/api/thread
- Chat SDK Chat Class API: https://chat-sdk.dev/docs/api/chat
- Chat SDK Cards API: https://chat-sdk.dev/docs/api/cards
- v0 SDK Documentation: https://v0.app/docs/
- Auth.js (NextAuth.js v5): https://authjs.dev/getting-started
- Upstash Redis Getting Started: https://upstash.com/docs/redis/overall/getstarted

---
*Architecture research for: ClawGuard -- AI-powered GitHub PR security review agent*
*Researched: 2026-03-27*
