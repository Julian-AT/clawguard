# Phase 1: Foundation & Bot Wiring - Research

**Researched:** 2026-03-27
**Domain:** Chat SDK + Next.js webhook integration, Vercel Sandbox, Upstash Redis, AI SDK agents
**Confidence:** HIGH

## Summary

Phase 1 proves the full infrastructure chain: GitHub @mention → webhook → background processing → sandbox → Redis → PR reply. The highest risk (Chat SDK + Next.js) is well-mitigated: the official Slack+Next.js guide provides an exact `after()` pattern that maps directly to GitHub, so the Hono-to-Next.js adaptation is a known translation, not a speculative spike. The GitHub adapter does NOT support streaming or interactive buttons — cards render as GFM Markdown — which simplifies Phase 1 scope but affects how future phases design PR summary output.

The complete pipeline involves five packages wired through a single Next.js Route Handler: `chat` + `@chat-adapter/github` for webhook parsing and PR thread interaction, `@vercel/sandbox` + `bash-tool` for isolated repo cloning, `ai` (`ToolLoopAgent`) + `@ai-sdk/gateway` for the AI agent loop, and `@upstash/redis` for audit storage. Two Redis connection modes (HTTP REST for audit data, TCP for Chat SDK state) are needed — both available from a single Upstash instance.

**Primary recommendation:** Follow the Slack+Next.js guide pattern verbatim for the webhook route handler, adapt the Hono code review guide's `reviewPullRequest` function for sandbox/agent logic, and add idempotency at the route handler level using `X-GitHub-Delivery` header with Redis SETNX.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Lead with Chat SDK + GitHub adapter targeting Next.js route handlers. If integration fails within a 2-hour timebox, fall back to direct Octokit + manual webhook parsing.
- **D-02:** The fallback means losing JSX cards, streaming, and built-in thread management — those would be reimplemented with plain GFM markdown and Octokit REST calls.
- **D-03:** Use phased status updates — post an immediate acknowledgment message when the @mention is received, then edit/update the message as each processing step completes (cloning, analyzing, storing, done).
- **D-04:** This gives the demo audience a sense of live progress rather than a silent wait.
- **D-05:** Phase 1 stores the bare minimum — raw output plus key metadata (timestamp, PR info, trigger source, status). The schema evolves as downstream phases define their data needs.
- **D-06:** Key format: `{owner}/{repo}/pr/{number}` as specified in project requirements.
- **D-07:** Post friendly generic error messages to the PR thread when the pipeline fails. No internal diagnostics exposed — keep it looking polished for the demo.

### Claude's Discretion
- How polished the Phase 1 final posted message is (bare minimum confirmation vs. light data preview) — whatever best proves the chain works end-to-end
- Specific `waitUntil` / `after()` pattern for background processing in Next.js route handlers
- Webhook signature verification implementation approach
- Idempotency mechanism for preventing duplicate event processing
- Redis connection setup (HTTP REST via @upstash/redis for audit data, TCP via redis@5 for Chat SDK state)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOOK-01 | GitHub webhook endpoint receives @mention events and routes them to the analysis pipeline | Chat SDK Slack+Next.js guide provides exact Route Handler pattern with `after()` for background processing |
| HOOK-02 | Chat SDK GitHub adapter handles PR thread interactions (post messages, edit messages, post cards) | GitHub adapter docs confirm post/edit/delete support; cards render as GFM Markdown; no streaming |
| HOOK-03 | Background processing via `after()` / `waitUntil` keeps serverless function alive during analysis | Next.js `after()` from `next/server` wraps Chat SDK's `waitUntil` callback pattern — verified in Slack guide |
| HOOK-04 | Webhook signature verification prevents unauthorized requests | Chat SDK GitHub adapter handles signature verification internally via `GITHUB_WEBHOOK_SECRET` env var |
| HOOK-05 | Idempotent event handling prevents duplicate analysis from webhook retries | Use `X-GitHub-Delivery` header with Redis SETNX at route handler level, before Chat SDK processing |
| SCAN-01 | Vercel Sandbox clones target repo and checks out the PR branch for isolated analysis | `Sandbox.create({ source: { type: 'git' } })` + `runCommand('git', ['checkout', branch])` — verified in SDK docs |
| SCAN-07 | Structured JSON output stored in Upstash Redis keyed by `{owner}/{repo}/pr/{number}` | `@upstash/redis` HTTP REST client, `redis.set(key, JSON.stringify(data))` — serverless-optimized |
| SCAN-08 | ToolLoopAgent uses Vercel AI Gateway (model configurable via config) | `ToolLoopAgent` with `model: 'anthropic/claude-sonnet-4.6'` via `@ai-sdk/gateway` — auto-routes through AI Gateway |
</phase_requirements>

## Standard Stack

### Core (Phase 1 Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.1 | Full-stack framework, Route Handlers for webhooks | Verified npm 2026-03-27. App Router Route Handlers replace Hono server. |
| react | 19.2.4 | UI runtime (required by Next.js) | Peer dependency of Next.js 16. |
| typescript | 6.0.2 | Type safety | Latest stable, full ecosystem support. |
| chat | 4.23.0 | Chat bot SDK — webhook parsing, event routing, thread management | Verified npm 2026-03-27. Platform-agnostic, adapter pattern. |
| @chat-adapter/github | 4.23.0 | GitHub PR thread integration — @mention detection, comment posting | Bundles `@octokit/rest@^22.0.1` and `@octokit/auth-app@^8.2.0` internally. |
| @chat-adapter/state-redis | 4.23.0 | Chat state persistence — thread subscriptions, distributed locks | Uses `redis@^5.11.0` (TCP) internally. Requires `REDIS_URL`. |
| ai | 6.0.141 | AI agent framework — ToolLoopAgent, generateText, structured output | Verified npm 2026-03-27. Bundles `@ai-sdk/gateway@3.0.83`. |
| @vercel/sandbox | 1.9.0 | Isolated microVM for repo cloning and analysis | Verified npm 2026-03-27. Requires OIDC token. |
| bash-tool | 1.3.15 | Sandbox agent tools — bash, readFile, writeFile | Verified npm 2026-03-27. Uses `just-bash` for safe execution. |
| @upstash/redis | 1.37.0 | Audit result storage (HTTP REST) | Verified npm 2026-03-27. Serverless-optimized, no TCP connection management. |
| zod | 4.3.6 | Schema validation, structured AI output | AI SDK peer-requires `^3.25.76 \|\| ^4.1.8`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @octokit/rest | 22.0.1 | Direct GitHub API calls | PR metadata fetching (head/base branch refs). Adapter bundles this but install separately for direct use. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Chat SDK | Direct Octokit + manual webhook | Loses JSX cards, thread management, signature verification. Fallback if Chat SDK fails in 2-hour spike. |
| `after()` from next/server | `waitUntil` from @vercel/functions | Both work. `after()` is the official Next.js API, `waitUntil` is lower-level Vercel primitives. Slack guide uses `after()`. |
| Upstash Redis (HTTP) | ioredis (TCP) | Upstash HTTP is serverless-native, no connection pooling needed. TCP required only for Chat SDK state adapter. |

**Installation (Phase 1 only):**
```bash
npm install next@16.2.1 react@19.2.4 react-dom@19.2.4
npm install chat@4.23.0 @chat-adapter/github@4.23.0 @chat-adapter/state-redis@4.23.0
npm install ai@6.0.141 zod@4.3.6
npm install @vercel/sandbox@1.9.0 bash-tool@1.3.15
npm install @upstash/redis@1.37.0
npm install @octokit/rest@22.0.1
npm install -D typescript@6.0.2 @types/react @types/react-dom @types/node
```

**Version verification:** All versions confirmed against npm registry on 2026-03-27.

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
app/
├── api/
│   └── webhooks/
│       └── github/
│           └── route.ts          # Webhook entry point (POST handler)
├── layout.tsx                    # Root layout (minimal for Phase 1)
└── page.tsx                      # Placeholder landing page
lib/
├── bot.ts                        # Chat SDK instance + event handlers
├── review.ts                     # Sandbox + ToolLoopAgent pipeline
└── redis.ts                      # Upstash Redis client + audit storage
```

### Pattern 1: Next.js Webhook Route Handler with `after()`

**What:** Adapts the Chat SDK's Hono pattern to Next.js Route Handlers using `after()` for background processing.
**When to use:** All webhook endpoints in this project.
**Source:** Chat SDK Slack+Next.js guide (https://chat-sdk.dev/docs/guides/slack-nextjs)

```typescript
// app/api/webhooks/github/route.ts
import { after } from "next/server";
import { bot } from "@/lib/bot";

export const maxDuration = 300; // 5 minutes for sandbox operations

export async function POST(request: Request) {
  const handler = bot.webhooks.github;
  if (!handler) {
    return new Response("GitHub adapter not configured", { status: 404 });
  }
  return handler(request, {
    waitUntil: (task) => after(() => task),
  });
}
```

The `after()` function from `next/server` schedules work to execute after the response is sent. The Chat SDK expects a `waitUntil` function — wrapping with `after(() => task)` bridges the two APIs. The `maxDuration` route segment config extends the serverless function timeout for sandbox operations.

### Pattern 2: Chat SDK Bot Instance with GitHub Adapter

**What:** Creates a Chat bot that auto-detects GitHub credentials from env vars and routes webhook events to handlers.
**When to use:** Single bot instance shared across the app.
**Source:** Chat SDK code review guide + GitHub adapter docs

```typescript
// lib/bot.ts
import { Chat } from "chat";
import { createGitHubAdapter } from "@chat-adapter/github";
import { createRedisState } from "@chat-adapter/state-redis";

export const bot = new Chat({
  userName: process.env.GITHUB_BOT_USERNAME || "clawguard",
  adapters: {
    github: createGitHubAdapter(),
  },
  state: createRedisState(),
});
```

The adapter auto-detects `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, and `GITHUB_BOT_USERNAME` from environment variables. The state adapter reads `REDIS_URL` (TCP connection to Upstash).

### Pattern 3: Phased Status Updates via Message Editing

**What:** Post an immediate acknowledgment, then edit the message as processing progresses.
**When to use:** Long-running pipeline operations where the user needs progress feedback.

```typescript
bot.onNewMention(async (thread, message) => {
  const ack = await thread.post("Received! Starting security review...");
  await thread.subscribe();

  // Phase: Cloning
  await thread.editMessage(ack.id, "Cloning repository...");
  const reviewResult = await runReviewPipeline(/* ... */);

  // Phase: Storing
  await thread.editMessage(ack.id, "Storing results...");
  await storeAuditResult(/* ... */);

  // Phase: Complete
  await thread.post("Security review complete! Results stored.");
});
```

**GitHub adapter note:** `editMessage` is supported. Since GitHub doesn't support streaming, phased edits are the only way to show progress.

### Pattern 4: Sandbox-Based Code Review Pipeline

**What:** Clones a repo into a Vercel Sandbox, runs a ToolLoopAgent with bash tools to analyze code.
**When to use:** All code analysis operations.
**Source:** Chat SDK code review guide (https://chat-sdk.dev/docs/guides/code-review-hono)

```typescript
// lib/review.ts
import { Sandbox } from "@vercel/sandbox";
import { ToolLoopAgent, stepCountIs } from "ai";
import { createBashTool } from "bash-tool";

export async function reviewPullRequest(input: {
  owner: string;
  repo: string;
  prBranch: string;
  baseBranch: string;
}): Promise<string> {
  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: `https://github.com/${input.owner}/${input.repo}`,
      username: "x-access-token",
      password: process.env.GITHUB_TOKEN!,
      depth: 50,
    },
    timeout: 5 * 60 * 1000,
  });

  try {
    await sandbox.runCommand("git", ["fetch", "origin", input.prBranch, input.baseBranch]);
    await sandbox.runCommand("git", ["checkout", input.prBranch]);

    const diffResult = await sandbox.runCommand("git", ["diff", `origin/${input.baseBranch}...HEAD`]);
    const diff = await diffResult.stdout();

    const { tools } = await createBashTool({ sandbox });

    const agent = new ToolLoopAgent({
      model: "anthropic/claude-sonnet-4.6",
      tools,
      stopWhen: stepCountIs(20),
    });

    const result = await agent.generate({
      prompt: `<security-review-prompt>\n${diff}\n</security-review-prompt>`,
    });

    return result.text;
  } finally {
    await sandbox.stop();
  }
}
```

### Pattern 5: Idempotency via X-GitHub-Delivery Header

**What:** Prevents duplicate processing when GitHub retries webhook deliveries.
**When to use:** Webhook route handler, before passing request to Chat SDK.

```typescript
import { redis } from "@/lib/redis";

export async function POST(request: Request) {
  const deliveryId = request.headers.get("x-github-delivery");
  if (deliveryId) {
    const key = `webhook:delivery:${deliveryId}`;
    const isNew = await redis.set(key, "1", { nx: true, ex: 3600 });
    if (!isNew) {
      return new Response("Already processed", { status: 200 });
    }
  }

  const handler = bot.webhooks.github;
  if (!handler) {
    return new Response("Not configured", { status: 404 });
  }
  return handler(request, {
    waitUntil: (task) => after(() => task),
  });
}
```

**Key:** Reading headers does NOT consume the request body, so the Chat SDK can still read it for signature verification. The 1-hour TTL (`ex: 3600`) prevents Redis from accumulating stale keys indefinitely. GitHub returns 200 for already-processed deliveries (any non-error status prevents retries).

### Anti-Patterns to Avoid

- **Consuming the request body before Chat SDK:** Never `await request.json()` or `await request.text()` before passing to `bot.webhooks.github` — the body can only be read once and the SDK needs it for signature verification.
- **Using `waitUntil` from `@vercel/functions` in Route Handlers:** Use `after()` from `next/server` instead — it's the official Next.js API and works correctly with the App Router lifecycle.
- **Creating Sandbox inside the webhook response path:** Always create sandboxes inside the `after()` callback (via Chat SDK event handlers). Sandbox creation takes 2-5 seconds, which would delay the webhook response.
- **Hardcoding Redis connection strings:** Both `@upstash/redis` and `@chat-adapter/state-redis` auto-detect from environment variables. Use env vars consistently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC-SHA256 verification | Chat SDK's built-in `webhookSecret` handling | SDK handles the full verification flow, including constant-time comparison |
| GitHub @mention detection | Regex parsing of comment body | `@chat-adapter/github` mention routing | SDK handles mention detection, bot self-filtering, and event routing |
| Thread/conversation management | Custom state tracking for PR threads | Chat SDK's `thread.subscribe()` + `onSubscribedMessage` | SDK manages subscription state, message routing, and thread lifecycle |
| Sandbox agent tooling | Custom exec/readFile functions | `bash-tool` package (`createBashTool`) | Provides bash, readFile, writeFile scoped to sandbox with security boundaries |
| Agent tool loop | Custom while-loop with tool calls | `ToolLoopAgent` from AI SDK | Handles step counting, tool result injection, stop conditions, error recovery |
| Redis deduplication | Custom locking/transaction logic | `redis.set(key, val, { nx: true, ex: ttl })` | Atomic SETNX is race-condition-free for idempotency checks |

**Key insight:** Phase 1's value is proving the wiring works end-to-end. Every component that can be delegated to a library should be — the risk is in integration, not implementation.

## Common Pitfalls

### Pitfall 1: Request Body Double-Read in Webhook Handler
**What goes wrong:** Calling `request.json()` or `request.text()` before passing the request to the Chat SDK handler consumes the body stream. The SDK then fails to verify the webhook signature because the body is empty.
**Why it happens:** Web API `Request` bodies are one-shot readable streams.
**How to avoid:** Only read headers (not body) before passing to the Chat SDK handler. The idempotency check uses `request.headers.get("x-github-delivery")` which is safe.
**Warning signs:** "Invalid signature" errors from the Chat SDK, even with correct webhook secret.

### Pitfall 2: Two Redis Connection Protocols Required
**What goes wrong:** Configuring only `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` and expecting Chat SDK state to work. The Chat SDK state adapter requires a TCP connection via `REDIS_URL`.
**Why it happens:** `@upstash/redis` uses HTTP REST. `@chat-adapter/state-redis` uses `redis@^5.11.0` (TCP/node-redis).
**How to avoid:** Configure THREE env vars: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (for audit storage) AND `REDIS_URL=redis://default:TOKEN@ENDPOINT:PORT` (for Chat SDK state). Upstash provides both protocols from the same instance.
**Warning signs:** "ECONNREFUSED" or "Connection refused" errors from the Chat SDK state adapter.

### Pitfall 3: Sandbox OIDC Token Missing in Local Dev
**What goes wrong:** `Sandbox.create()` fails with authentication error when running locally.
**Why it happens:** Vercel OIDC tokens are auto-injected in Vercel deployments but not available locally.
**How to avoid:** Run `vercel link` then `vercel env pull` to get development OIDC token into `.env.local`. Alternatively, use a Vercel access token.
**Warning signs:** "Unauthorized" or "OIDC token not found" errors from `@vercel/sandbox`.

### Pitfall 4: Webhook Content-Type Must Be application/json
**What goes wrong:** Chat SDK fails to parse the webhook payload, events don't fire.
**Why it happens:** GitHub defaults to `application/x-www-form-urlencoded` for webhooks. The Chat SDK requires `application/json`.
**How to avoid:** When configuring the GitHub webhook, explicitly set Content-Type to `application/json`.
**Warning signs:** "Invalid JSON" errors from the Chat SDK.

### Pitfall 5: GitHub Adapter Has No Interactive Buttons
**What goes wrong:** Planning for clickable "Auto-Fix" buttons in the PR summary card, then discovering they render as plain text on GitHub.
**Why it happens:** GitHub's comment system doesn't support interactive elements. The Chat SDK `Button` component renders as text on GitHub.
**How to avoid:** Use `LinkButton` for external links (rendered as markdown links) or plain text with instructions. Phase 1 doesn't need buttons, but future phases must account for this.
**Warning signs:** `<Button>` components appearing as literal text like `[Approve]` instead of clickable elements.

### Pitfall 6: maxDuration Not Set on Webhook Route
**What goes wrong:** Serverless function times out after the default 10-second limit, killing the sandbox operation mid-analysis.
**Why it happens:** Vercel's default function timeout is 10s (Hobby) or 15s (Pro). Sandbox operations take 30s-5min.
**How to avoid:** Export `maxDuration = 300` from the route handler file. The `after()` callback respects this timeout.
**Warning signs:** Function timeout errors in Vercel logs, partial results, sandbox left running without cleanup.

### Pitfall 7: bash-tool Uses Zod 3, Project Uses Zod 4
**What goes wrong:** Potential type mismatches if passing bash-tool's Zod schemas to AI SDK functions expecting Zod 4.
**Why it happens:** `bash-tool@1.3.15` depends on `zod@^3.23.8`. The project uses `zod@4.3.6`. npm installs both versions.
**How to avoid:** Don't mix Zod versions in the same schema chain. bash-tool's tools work with AI SDK's `ToolLoopAgent` because the AI SDK handles the Zod version bridging internally.
**Warning signs:** Type errors involving `ZodType` incompatibility at the TypeScript level (runtime typically works fine due to duck typing).

## Code Examples

### Complete Webhook Route Handler (Phase 1)

```typescript
// app/api/webhooks/github/route.ts
// Source: Adapted from Chat SDK Slack+Next.js guide
import { after } from "next/server";
import { bot } from "@/lib/bot";
import { redis } from "@/lib/redis";

export const maxDuration = 300;

export async function POST(request: Request) {
  const deliveryId = request.headers.get("x-github-delivery");
  if (deliveryId) {
    const isNew = await redis.set(`webhook:delivery:${deliveryId}`, "1", {
      nx: true,
      ex: 3600,
    });
    if (!isNew) {
      return new Response("OK", { status: 200 });
    }
  }

  const handler = bot.webhooks.github;
  if (!handler) {
    return new Response("GitHub adapter not configured", { status: 404 });
  }

  return handler(request, {
    waitUntil: (task) => after(() => task),
  });
}
```

### Complete Bot Setup (Phase 1)

```typescript
// lib/bot.ts
// Source: Chat SDK code review guide + GitHub adapter docs
import { Chat } from "chat";
import { createGitHubAdapter } from "@chat-adapter/github";
import { createRedisState } from "@chat-adapter/state-redis";
import { Octokit } from "@octokit/rest";
import type { GitHubRawMessage } from "@chat-adapter/github";
import { reviewPullRequest } from "./review";
import { storeAuditResult } from "./redis";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export const bot = new Chat({
  userName: process.env.GITHUB_BOT_USERNAME || "clawguard",
  adapters: {
    github: createGitHubAdapter(),
  },
  state: createRedisState(),
});

bot.onNewMention(async (thread, message) => {
  const raw = message.raw as GitHubRawMessage;
  const { owner, repo, prNumber } = {
    owner: raw.repository.owner.login,
    repo: raw.repository.name,
    prNumber: raw.prNumber,
  };

  await thread.post("Received! Starting security review...");
  await thread.subscribe();

  try {
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const reviewResult = await reviewPullRequest({
      owner,
      repo,
      prBranch: pr.head.ref,
      baseBranch: pr.base.ref,
    });

    await storeAuditResult({
      key: `${owner}/${repo}/pr/${prNumber}`,
      data: {
        result: reviewResult,
        timestamp: new Date().toISOString(),
        pr: { owner, repo, number: prNumber, title: pr.title },
        status: "complete",
      },
    });

    await thread.post(`Security review complete for PR #${prNumber}.`);
  } catch (error) {
    await thread.post(
      "Something went wrong during the security review. Please try again."
    );
  }
});

bot.onSubscribedMessage(async (thread, message) => {
  await thread.post(
    "I've already reviewed this PR. @mention me on a new PR to start another review."
  );
});
```

### Redis Audit Storage (Phase 1)

```typescript
// lib/redis.ts
// Source: @upstash/redis docs
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface AuditData {
  result: string;
  timestamp: string;
  pr: { owner: string; repo: string; number: number; title: string };
  status: "processing" | "complete" | "error";
}

export async function storeAuditResult(params: {
  key: string;
  data: AuditData;
}) {
  await redis.set(params.key, JSON.stringify(params.data));
}

export async function getAuditResult(key: string): Promise<AuditData | null> {
  const raw = await redis.get<string>(key);
  return raw ? JSON.parse(raw) : null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `waitUntil` from `@vercel/functions` | `after()` from `next/server` | Next.js 15.1 (stable) | Use `after()` in Route Handlers — it's the official API |
| Manual webhook parsing + Octokit | Chat SDK + platform adapters | chat@4.x (2025-2026) | SDK handles signature verification, event routing, thread management |
| `generateText()` with manual tool loop | `ToolLoopAgent` class | ai@6.x (2026) | Single class manages the entire agent loop with stop conditions |
| Custom sandbox scripts | `bash-tool` + `@vercel/sandbox` | 2026 | Standardized tools for AI agents in sandbox environments |

**Deprecated/outdated:**
- `unstable_after` → replaced by stable `after()` in Next.js 15.1+
- `@vercel/functions` `waitUntil` → still works but `after()` is preferred in Next.js context

## GitHub Adapter Capability Matrix (Critical for All Phases)

Understanding what the GitHub adapter can and cannot do is essential for Phase 1 and all downstream phases.

| Feature | Supported | Notes |
|---------|-----------|-------|
| Post message | Yes | Comments on PR thread |
| Edit message | Yes | Update existing comments |
| Delete message | Yes | Remove bot comments |
| Cards (JSX) | GFM Markdown | Rendered as formatted tables/text, NOT native cards |
| Buttons | No | Rendered as plain text; use LinkButton for links |
| LinkButton | No | Rendered as markdown `[text](url)` inline |
| Tables | GFM | Native GitHub Flavored Markdown tables |
| Fields (key-value) | Yes | Rendered as markdown fields |
| Streaming | No | Post full message, then edit for updates |
| Modals | No | GitHub doesn't support modals |
| Reactions | Yes | +1, -1, heart, rocket, etc. |
| Mention detection | Yes | `onNewMention` fires on @mention |
| Thread subscribe | Yes | `thread.subscribe()` for follow-up messages |
| Fetch messages | Yes | `thread.allMessages` for history |

**Thread ID format:** `github:{owner}/{repo}:{prNumber}`

**Implication for Phase 1:** Phased status updates (D-03) must use `thread.post()` + `thread.editMessage()` since streaming is not available. Future phases that planned for interactive buttons (CARD-04) must use link-based alternatives.

## Open Questions

1. **`GitHubRawMessage` Type Shape**
   - What we know: The code review guide accesses `raw.repository.owner.login`, `raw.repository.name`, `raw.prNumber`
   - What's unclear: Full TypeScript type definition for `GitHubRawMessage` — are there other useful fields (PR head/base refs directly, installation ID)?
   - Recommendation: Import `GitHubRawMessage` from `@chat-adapter/github` and inspect via TypeScript. The guide's usage pattern is confirmed working.

2. **`thread.editMessage()` API**
   - What we know: GitHub adapter supports message editing per the feature matrix
   - What's unclear: Exact return type and whether `thread.post()` returns a message ID usable with `editMessage()`
   - Recommendation: Test during implementation. Fallback: post new messages instead of editing (still shows progress, just noisier).

3. **Chat SDK `onError` Handling**
   - What we know: The SDK has an error handling section in docs
   - What's unclear: Whether unhandled errors in `onNewMention` bubble to the webhook response or are swallowed
   - Recommendation: Wrap handler body in try/catch and post error message to thread (per D-07). Test error propagation during spike.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | v25.5.0 | — |
| npm | Package management | ✓ | 11.8.0 | — |
| git | Version control | ✓ | 2.52.0 | — |
| Vercel CLI | Sandbox OIDC, deployment | ✓ | 50.34.2 | — |
| GitHub App credentials | Webhook auth | External setup | — | Personal Access Token (simpler, lower rate limits) |
| Upstash Redis instance | Audit storage + Chat state | External setup | — | Local Redis via Docker |
| Vercel project linked | Sandbox OIDC for local dev | Requires `vercel link` | — | Access token fallback |

**Missing dependencies with no fallback:**
- GitHub App or PAT credentials (must be configured before testing)
- Upstash Redis instance (must be provisioned)

**Missing dependencies with fallback:**
- Vercel OIDC token for local dev → fallback to `vercel link && vercel env pull`

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (recommended for Next.js + TypeScript) |
| Config file | none — Wave 0 must create `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOOK-01 | Webhook route returns 200, routes to pipeline | integration | `npx vitest run tests/webhook-handler.test.ts -t "routes mention to pipeline"` | ❌ Wave 0 |
| HOOK-02 | Bot posts message to PR thread | integration (mock) | `npx vitest run tests/bot.test.ts -t "posts acknowledgment"` | ❌ Wave 0 |
| HOOK-03 | Background processing via after() | unit | `npx vitest run tests/webhook-handler.test.ts -t "uses after for background"` | ❌ Wave 0 |
| HOOK-04 | Signature verification rejects bad requests | integration (mock) | `npx vitest run tests/webhook-handler.test.ts -t "rejects invalid signature"` | ❌ Wave 0 |
| HOOK-05 | Duplicate delivery returns 200, no reprocess | unit | `npx vitest run tests/idempotency.test.ts -t "deduplicates delivery"` | ❌ Wave 0 |
| SCAN-01 | Sandbox clones repo and checks out branch | integration | `npx vitest run tests/review.test.ts -t "clones and checks out"` | ❌ Wave 0 |
| SCAN-07 | Results stored in Redis by key | unit | `npx vitest run tests/redis.test.ts -t "stores and retrieves"` | ❌ Wave 0 |
| SCAN-08 | ToolLoopAgent uses AI Gateway model | integration (mock) | `npx vitest run tests/review.test.ts -t "uses gateway model"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — Vitest config for Next.js App Router
- [ ] `tests/webhook-handler.test.ts` — HOOK-01, HOOK-03, HOOK-04
- [ ] `tests/idempotency.test.ts` — HOOK-05
- [ ] `tests/bot.test.ts` — HOOK-02
- [ ] `tests/review.test.ts` — SCAN-01, SCAN-08
- [ ] `tests/redis.test.ts` — SCAN-07
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react`

## Sources

### Primary (HIGH confidence)
- Chat SDK Slack+Next.js guide: https://chat-sdk.dev/docs/guides/slack-nextjs — Route Handler + `after()` pattern (exact pattern for our webhook)
- Chat SDK code review guide: https://chat-sdk.dev/docs/guides/code-review-hono — Review function, Sandbox + ToolLoopAgent + bash-tool pipeline
- Chat SDK GitHub adapter: https://chat-sdk.dev/docs/adapters/github — Auth options, thread model, feature matrix, limitations
- Chat SDK Cards: https://chat-sdk.dev/docs/cards — JSX card API, component reference
- Chat SDK Streaming: https://chat-sdk.dev/docs/streaming — fullStream vs textStream, platform behavior
- Chat SDK Actions: https://chat-sdk.dev/docs/actions — onAction handler, ActionEvent
- Chat SDK Handling Events: https://chat-sdk.dev/docs/handling-events — onNewMention, onSubscribedMessage routing order
- AI SDK ToolLoopAgent: https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent — Constructor params, generate(), stream()
- AI SDK Agents Overview: https://ai-sdk.dev/docs/agents/overview — Architecture, why ToolLoopAgent
- Vercel Sandbox SDK: https://vercel.com/docs/vercel-sandbox/sdk-reference — Create, runCommand, readFile, writeFiles, stop
- Next.js `after()`: https://nextjs.org/docs/app/api-reference/functions/after — Background task API, Route Handler usage
- npm registry — all version numbers verified 2026-03-27

### Secondary (MEDIUM confidence)
- bash-tool GitHub: https://github.com/vercel-labs/bash-tool — Tool creation, sandbox integration
- Vercel bash-tool changelog: https://vercel.com/changelog/introducing-bash-tool-for-filesystem-based-context-retrieval — Context and capabilities

### Tertiary (LOW confidence)
- None — all claims verified against primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified on npm, STACK.md pre-validated
- Architecture: HIGH — Slack+Next.js guide provides exact pattern, code review guide provides pipeline pattern
- Pitfalls: HIGH — identified from official docs, adapter feature matrix, and STACK.md gotchas
- GitHub adapter limitations: HIGH — verified from official adapter docs feature matrix

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable packages, unlikely to change in 30 days)
