# Phase 5: Chat, Config & Dashboard - Research

**Researched:** 2026-03-28
**Domain:** Chat follow-up AI, YAML config parsing, GitHub OAuth dashboard
**Confidence:** HIGH

## Summary

Phase 5 adds three loosely coupled capabilities to ClawGuard: (1) AI-powered conversational follow-up in PR threads where developers ask security questions and get contextual responses referencing audit findings, (2) per-repo configuration via `.clawguard/config.yml` and `.clawguard/policies.yml` that customize audit behavior and inject custom security policies into the ToolLoopAgent system prompt, and (3) an authenticated dashboard with GitHub OAuth login showing connected repos and audit history.

The codebase is well-structured for all three additions. The bot's `onSubscribedMessage` handler already routes intents and has a clear integration point at `intent.type === "unknown"` for chat follow-up. The analysis pipeline phases (`phase1-quality.ts`, `phase2-vuln.ts`) already accept system prompt strings, making policy injection straightforward. The report page at `/report/[owner]/[repo]/[pr]/page.tsx` establishes the server component pattern for fetching from Redis, which the dashboard replicates.

The biggest stack change is BetterAuth replacing NextAuth (D-15). BetterAuth 1.5.6 supports stateless (database-free) sessions via signed cookies, eliminating the need for a database migration or ORM setup. It can use Upstash Redis as secondary storage for session revocation. The `yaml@2.8.3` package is already specified in CLAUDE.md for config parsing and is zero-dependency. The `@upstash/redis` SCAN command supports pattern matching for dashboard data queries.

**Primary recommendation:** Implement in three streams -- config reader first (unblocks pipeline integration), then chat follow-up (extends bot.ts), then dashboard (new route group with BetterAuth). Config and chat are backend-only; dashboard is the only web UI surface.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** AI-generated contextual replies for non-command follow-up questions. When `detectIntent()` returns `unknown`, instead of no-op, invoke the AI with audit context + user question to generate a security-focused response.
- **D-02:** Full audit context provided to the AI -- complete audit result JSON, PR diff, and conversation history from Redis. Maximum context for high-quality answers.
- **D-03:** Conversation history maintained in Redis per thread. Bot remembers earlier questions in the same PR thread for multi-turn conversations. Key pattern: `chat:{owner}/{repo}/pr/{number}`.
- **D-04:** Post complete messages (not streamed). Simpler, avoids GitHub comment edit rate limits. Post a "thinking..." placeholder, then replace with the full answer.
- **D-05:** Developer can request specific fixes via chat ("fix the SQL injection in users.ts") -- this is already handled by `detectIntent()` returning `fix-finding` intent. The new chat flow only handles questions that don't match existing command patterns.
- **D-06:** Repo card grid on the overview page -- each card shows repo name, last audit date, score badge, and open finding count. Click through to per-repo detail page. Reuses existing shadcn Card + Badge components.
- **D-07:** Audit list table on the per-repo detail page -- table rows with PR number/title, score badge, severity count pills, date, and report link. Sorted by most recent. Enterprise-dense aesthetic.
- **D-08:** Empty state: "No repos audited yet. @mention ClawGuard on a PR to get started." with a friendly onboarding message.
- **D-09:** Dashboard routes: `/dashboard` (overview grid), `/dashboard/[owner]/[repo]` (per-repo audit list).
- **D-10:** Fetch config per audit via Octokit Contents API from the repo's default branch before each audit starts. Octokit instance already available in `bot.ts`.
- **D-11:** Invalid YAML or unrecognized fields: warn and use defaults. Never block the pipeline on bad config. Mention the config warning in the summary card footer.
- **D-12:** Demo-friendly defaults when no config.yml exists: autoFix: true, severityThreshold: "medium", ignorePaths: [], model: gateway default. Aggressive defaults that showcase all features during demo.
- **D-13:** Policies from `.clawguard/policies.yml` injected into the ToolLoopAgent system prompt as additional security rules. Each policy has name, rule, and severity. Parsed with `yaml` package.
- **D-14:** Config schema validated with Zod after YAML parse. Valid fields: `autoFix`, `severityThreshold`, `ignorePaths`, `reportSettings`, `model`. Unknown fields ignored with warning.
- **D-15:** GitHub OAuth via BetterAuth (NOT NextAuth). Stack change from original plan -- BetterAuth preferred over NextAuth 4.
- **D-16:** Public reports, private dashboard. Report URLs (`/report/[owner]/[repo]/[pr]`) remain shareable without auth. Dashboard (`/dashboard/*`) requires login.
- **D-17:** Dashboard data scoping: GitHub repos -> Redis scan. Use GitHub API to list repos the logged-in user has access to, then query Redis for matching audit keys (`{owner}/{repo}/pr/*`).
- **D-18:** Session stored in cookie. Standard BetterAuth GitHub OAuth provider configuration.

### Claude's Discretion
- Chat response formatting (markdown structure, code blocks, security callouts)
- BetterAuth configuration and middleware setup
- Redis conversation history schema and TTL
- Dashboard page component composition and responsive breakpoints
- Config Zod schema exact field types and defaults
- Policy injection prompt engineering (how custom rules are woven into system prompt)
- Redis key scanning strategy for dashboard data queries
- Loading states and error handling on dashboard pages

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | Developer can @mention bot in PR thread for follow-up questions | Bot's `onSubscribedMessage` handler with `unknown` intent branch is the integration point. Use `generateText` from AI SDK for one-shot responses. |
| CHAT-02 | Bot responds with security-domain expertise using conversation context | Pass full audit result JSON + PR diff + conversation history as context to `generateText` with security-focused system prompt. |
| CHAT-03 | Conversation state maintained in Upstash Redis across messages | Store conversation history at key `chat:{owner}/{repo}/pr/{number}` as JSON array. TTL of 7 days. |
| CHAT-04 | Developer can request specific fixes via chat | Already implemented via `detectIntent()` returning `fix-finding` intent. No new work needed beyond existing D-05. |
| CONF-01 | Config reader fetches `.clawguard/config.yml` from repo via Octokit before audit | Use `octokit.rest.repos.getContent()` with base64 decode, then `YAML.parse()`. |
| CONF-02 | Config supports: autoFix, severityThreshold, ignorePaths, reportSettings, model | Zod schema with `.default()` for each field. `z.object()` with `z.passthrough()` approach for unknown fields. |
| CONF-03 | Policies reader fetches `.clawguard/policies.yml` -- custom security rules | Same Octokit + YAML pattern. Array of `{ name, rule, severity }` objects. |
| CONF-04 | Policies injected into ToolLoopAgent system prompt for enforcement | Append formatted policy rules to the `instructions` array in each analysis phase function. |
| CONF-05 | Sensible defaults when no config files exist in the repo | Return default config object when Octokit returns 404. Demo-friendly: autoFix: true, severityThreshold: "medium". |
| SCAN-09 | Custom policies from `.clawguard/policies.yml` injected into agent system prompt | Same as CONF-04. Pipeline functions accept policies parameter, format into prompt section. |
| DASH-01 | GitHub OAuth login via BetterAuth (changed from NextAuth) | BetterAuth 1.5.6 stateless mode with GitHub OAuth provider. Cookie-based sessions, no database required. |
| DASH-02 | Dashboard overview page showing grid of connected repo cards | Server component fetching repos via GitHub API + Redis SCAN. shadcn Card + Badge components from Phase 4. |
| DASH-03 | Per-repo detail page with list of all PR audits | Server component with Redis key scan by prefix `{owner}/{repo}/pr/*`. shadcn Table component (new install). |
| DASH-04 | Dashboard reads from same Redis store as audit results | Uses existing `@upstash/redis` client with SCAN command for key discovery + GET for data retrieval. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai | 6.0.141 | `generateText` for chat follow-up responses | Already in project. Simple one-shot text generation for chat replies. |
| @ai-sdk/gateway | 3.0.83 | Model routing for chat AI | Already bundled with `ai@6.x`. Same `gateway("anthropic/claude-sonnet-4.6")` pattern. |
| @upstash/redis | 1.37.0 | Conversation history, dashboard data queries (SCAN) | Already in project. HTTP REST client, serverless-native. SCAN supports pattern matching. |
| @octokit/rest | 22.0.1 | Fetch config/policies files from repo, list user repos for dashboard | Already in project. `repos.getContent()` for files, `repos.listForAuthenticatedUser()` for dashboard. |
| yaml | 2.8.3 | Parse `.clawguard/config.yml` and `policies.yml` | Specified in CLAUDE.md. Zero dependencies. YAML 1.2 spec. TypeScript types included. |
| zod | 4.3.6 | Config schema validation | Already in project. Validate parsed YAML against schema with defaults. |
| shadcn | 4.1.1 | UI components for dashboard | Already configured (New York style, zinc palette). Need to install table, avatar, dropdown-menu, breadcrumb. |

### New Package
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | 1.5.6 | GitHub OAuth authentication for dashboard | User decision D-15, replaces NextAuth. Supports stateless (cookie-only) sessions without database. `toNextJsHandler` for App Router integration. |

### Not Needed
| Library | Reason |
|---------|--------|
| next-auth | Replaced by BetterAuth per D-15. Remove from CLAUDE.md stack table. |
| @auth/core | Not needed with BetterAuth. |
| ioredis | BetterAuth stateless mode avoids needing a TCP Redis connection for sessions. |
| @better-auth/redis-storage | Only needed if using Redis as secondary storage for session revocation. Stateless cookie sessions with short maxAge are sufficient for this hackathon project. |

**Installation:**
```bash
npm install better-auth yaml
```

Note: `yaml` may already be installed as it is referenced in CLAUDE.md but not currently in `package.json`. Verify and install if missing.

**New shadcn components:**
```bash
npx shadcn@latest add table avatar dropdown-menu breadcrumb
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
  auth.ts                    # BetterAuth server instance
  auth-client.ts             # BetterAuth React client
  config.ts                  # Config/policies reader (CONF-01 through CONF-05)
  chat.ts                    # Chat follow-up AI handler (CHAT-01 through CHAT-03)
  redis.ts                   # Extended with conversation history + dashboard queries
app/
  api/
    auth/[...all]/route.ts   # BetterAuth catch-all API route
  dashboard/
    layout.tsx               # Dashboard layout with DashboardNav + auth check
    page.tsx                 # Overview grid (DASH-02)
    loading.tsx              # Skeleton cards
    error.tsx                # Error state
    [owner]/
      [repo]/
        page.tsx             # Per-repo audit table (DASH-03)
        loading.tsx          # Skeleton table
components/
  dashboard/
    nav.tsx                  # DashboardNav with logo + avatar + dropdown
    repo-card.tsx            # Repo overview card for grid
    audit-table.tsx          # PR audit history table
    empty-state.tsx          # Dashboard empty state
    repo-empty-state.tsx     # Per-repo empty state
```

### Pattern 1: Config Reader with Graceful Degradation
**What:** Fetch config from repo, parse YAML, validate with Zod, fall back to defaults on any error.
**When to use:** Before every audit run, in `runAuditAndPost` or `reviewPullRequest`.
**Example:**
```typescript
// lib/config.ts
import { z } from "zod";
import YAML from "yaml";
import { Octokit } from "@octokit/rest";

const ConfigSchema = z.object({
  autoFix: z.boolean().default(true),
  severityThreshold: z.enum(["critical", "high", "medium", "low", "info"]).default("medium"),
  ignorePaths: z.array(z.string()).default([]),
  reportSettings: z.object({}).passthrough().optional(),
  model: z.string().optional(),
});

export type ClawGuardConfig = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: ClawGuardConfig = {
  autoFix: true,
  severityThreshold: "medium",
  ignorePaths: [],
};

export async function loadConfig(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ config: ClawGuardConfig; warnings: string[] }> {
  const warnings: string[] = [];
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner, repo,
      path: ".clawguard/config.yml",
    });
    if ("content" in data && typeof data.content === "string") {
      const yaml = Buffer.from(data.content, "base64").toString("utf8");
      const parsed = YAML.parse(yaml);
      const result = ConfigSchema.safeParse(parsed);
      if (result.success) return { config: result.data, warnings };
      warnings.push(`Config validation errors: ${result.error.message}`);
    }
  } catch (err: any) {
    if (err.status !== 404) {
      warnings.push(`Failed to read config: ${err.message}`);
    }
  }
  return { config: DEFAULT_CONFIG, warnings };
}
```

### Pattern 2: Chat Follow-Up with Full Context
**What:** Generate AI responses to follow-up questions using audit context and conversation history.
**When to use:** In `onSubscribedMessage` when `detectIntent()` returns `unknown`.
**Example:**
```typescript
// lib/chat.ts
import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { redis } from "./redis";
import type { AuditData } from "./redis";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function handleChatFollowUp(params: {
  question: string;
  auditData: AuditData | null;
  threadKey: string; // chat:{owner}/{repo}/pr/{number}
}): Promise<string> {
  // Load conversation history from Redis
  const historyJson = await redis.get<string>(params.threadKey);
  const history: ChatMessage[] = historyJson ? JSON.parse(historyJson) : [];

  // Build context for the AI
  const systemPrompt = buildChatSystemPrompt(params.auditData);
  const messages = [
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: params.question },
  ];

  const { text } = await generateText({
    model: gateway("anthropic/claude-sonnet-4.6"),
    system: systemPrompt,
    messages,
  });

  // Save updated history
  history.push({ role: "user", content: params.question });
  history.push({ role: "assistant", content: text });
  await redis.set(params.threadKey, JSON.stringify(history), { ex: 604800 }); // 7-day TTL

  return text;
}
```

### Pattern 3: BetterAuth Stateless Setup (No Database)
**What:** Cookie-based sessions without database requirements.
**When to use:** Dashboard authentication.
**Example:**
```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24, // 24 hours
    },
  },
});

// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);

// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
```

### Pattern 4: Dashboard Data via Redis SCAN
**What:** Discover audit keys matching repos the user can access.
**When to use:** Dashboard overview and per-repo pages.
**Example:**
```typescript
// lib/redis.ts (new functions)
export async function scanAuditKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [nextCursor, batch] = await redis.scan(cursor, {
      match: `${prefix}/pr/*`,
      count: 100,
    });
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

export async function getRepoAudits(owner: string, repo: string): Promise<AuditData[]> {
  const keys = await scanAuditKeys(`${owner}/${repo}`);
  if (keys.length === 0) return [];
  const results = await Promise.all(keys.map(k => getAuditResult(k)));
  return results
    .filter((r): r is AuditData => r !== null && r.status === "complete")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
```

### Pattern 5: Dashboard Auth Layout with Server-Side Session Check
**What:** Protect dashboard routes with server-side session validation.
**When to use:** `app/dashboard/layout.tsx` as the auth gate.
**Example:**
```typescript
// app/dashboard/layout.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/api/auth/signin/github");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={session.user} />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Blocking the pipeline on config errors:** Invalid YAML, missing files, or Zod validation failures must NEVER throw. Always fall back to defaults with a warning (D-11).
- **Streaming chat responses to GitHub:** GitHub comment editing has rate limits. Always post a placeholder and replace with the complete response (D-04).
- **Using NextAuth instead of BetterAuth:** User explicitly chose BetterAuth (D-15). Do not use `next-auth` or `@auth/core`.
- **Database-dependent auth:** BetterAuth should run in stateless mode with cookie sessions. No SQLite/Postgres setup needed (D-18).
- **Modifying `detectIntent()` for chat:** The existing intent detection already handles `fix-finding` (D-05). Chat follow-up only fires for `unknown` intents.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | Custom string parser | `yaml@2.8.3` YAML.parse() | Edge cases in YAML 1.2 spec (multiline, anchors, special characters) |
| Schema validation with defaults | Manual field checking | Zod `z.object().default()` | Type inference, error messages, `.safeParse()` for graceful failure |
| OAuth flow | Custom OAuth implementation | BetterAuth `socialProviders.github` | PKCE, CSRF protection, token refresh, cookie signing all handled |
| Session management | JWT helpers + manual cookies | BetterAuth stateless session `cookieCache` | Cookie signing, encryption, expiration, refresh logic built-in |
| Base64 decode | Custom decoder | `Buffer.from(content, "base64")` | Standard Node.js API, handles padding correctly |
| Key discovery in Redis | Store index keys separately | `@upstash/redis` SCAN with pattern | Atomic, no consistency issues between index and data |
| Relative time formatting | Date math + string building | `Intl.RelativeTimeFormat` or simple "Xh ago" helper | Browser/Node native, locale-aware |

**Key insight:** All three features (chat, config, dashboard) are composed from libraries already in the project or specified in CLAUDE.md. The only new dependency is `better-auth` (replacing `next-auth`). The risk is in integration, not in technology selection.

## Common Pitfalls

### Pitfall 1: BetterAuth Stateless Mode Requires BETTER_AUTH_SECRET
**What goes wrong:** BetterAuth fails to start or cookies are unsigned/unverified.
**Why it happens:** Stateless mode signs session cookies with `BETTER_AUTH_SECRET`. Without it, session validation fails silently or throws.
**How to avoid:** Set `BETTER_AUTH_SECRET` in `.env` and on Vercel. Generate a strong random secret (at least 32 characters).
**Warning signs:** Login succeeds but session is not persisted, or `auth.api.getSession()` always returns null.

### Pitfall 2: Octokit 404 vs Actual Errors for Config Fetch
**What goes wrong:** Config reader catches all errors as "file not found" and silently uses defaults even when there's a real problem (auth failure, rate limiting, network error).
**Why it happens:** Using a broad catch without checking `error.status`.
**How to avoid:** Explicitly check for `status === 404` (file not found = expected, use defaults). Log and warn on other status codes (403 = rate limited, 401 = bad token).
**Warning signs:** Config always falls back to defaults even when the repo has a config file.

### Pitfall 3: Redis SCAN Cursor Returns String "0", Not Number 0
**What goes wrong:** Infinite SCAN loop or premature termination.
**Why it happens:** `@upstash/redis` SCAN returns cursor as string `"0"`, but comparison with number `0` fails.
**How to avoid:** Always compare `cursor !== "0"` (string comparison). The documented API returns `[cursor: string, keys: string[]]`.
**Warning signs:** Dashboard page hangs or returns empty results even though Redis has data.

### Pitfall 4: Conversation History Size Exceeding Context Window
**What goes wrong:** Chat AI responses degrade or fail when conversation history + audit context exceeds the model's context window.
**Why it happens:** Full audit result JSON can be 10-50KB. Conversation history grows unbounded without pruning.
**How to avoid:** Limit conversation history to last N messages (e.g., 10). Truncate audit context to findings summary + top findings rather than full JSON. Set a hard character limit on the combined prompt.
**Warning signs:** AI responses become generic, repeat themselves, or the API returns context length errors.

### Pitfall 5: GitHub OAuth Callback URL Mismatch
**What goes wrong:** GitHub OAuth redirects fail with "redirect_uri mismatch" error.
**Why it happens:** The callback URL configured in the GitHub OAuth app doesn't match the BetterAuth route. BetterAuth expects callbacks at `/api/auth/callback/github`.
**How to avoid:** Set the GitHub OAuth app's callback URL to `{BETTER_AUTH_URL}/api/auth/callback/github`. In development: `http://localhost:3000/api/auth/callback/github`. In production: the Vercel URL.
**Warning signs:** OAuth flow initiates but fails after GitHub authorization.

### Pitfall 6: Dashboard Server Component Fetching User Repos Without User's Token
**What goes wrong:** Dashboard shows all repos the app has access to instead of repos the logged-in user can see, or returns 0 repos.
**Why it happens:** Using the GitHub App's installation token (from `process.env.GITHUB_TOKEN`) instead of the user's OAuth token for listing repos.
**How to avoid:** BetterAuth stores the user's GitHub OAuth access token in the account. Retrieve it from the session and create a user-scoped Octokit instance for `repos.listForAuthenticatedUser()`.
**Warning signs:** Dashboard shows repos the user shouldn't see, or shows no repos at all.

### Pitfall 7: `yaml` Package parse() Throws on Invalid YAML
**What goes wrong:** Pipeline crashes when a repo has malformed YAML in config.
**Why it happens:** `YAML.parse()` throws on syntax errors by default.
**How to avoid:** Wrap `YAML.parse()` in try/catch. Or use `YAML.parseDocument()` which collects errors instead of throwing, then check `doc.errors.length`.
**Warning signs:** Audit fails for repos with typos in their config files.

## Code Examples

### Config Reader: Complete Implementation Pattern
```typescript
// lib/config.ts
import { z } from "zod";
import YAML from "yaml";
import type { Octokit } from "@octokit/rest";

// Config schema (CONF-02)
export const ClawGuardConfigSchema = z.object({
  autoFix: z.boolean().default(true),
  severityThreshold: z.enum(["critical", "high", "medium", "low", "info"]).default("medium"),
  ignorePaths: z.array(z.string()).default([]),
  reportSettings: z.record(z.unknown()).optional(),
  model: z.string().optional(),
}).passthrough(); // Allow unknown fields (D-14: ignore with warning)

export type ClawGuardConfig = z.infer<typeof ClawGuardConfigSchema>;

// Policy schema (CONF-03)
export const PolicySchema = z.object({
  name: z.string(),
  rule: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
});

export const PoliciesSchema = z.object({
  policies: z.array(PolicySchema).default([]),
});

export type Policy = z.infer<typeof PolicySchema>;

// Default config (D-12)
export const DEFAULT_CONFIG: ClawGuardConfig = {
  autoFix: true,
  severityThreshold: "medium",
  ignorePaths: [],
};

// Fetch file helper
async function fetchRepoFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
    if ("content" in data && typeof data.content === "string") {
      return Buffer.from(data.content, "base64").toString("utf8");
    }
    return null;
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}

// CONF-01, CONF-05
export async function loadConfig(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ config: ClawGuardConfig; warnings: string[] }> {
  const warnings: string[] = [];
  try {
    const content = await fetchRepoFile(octokit, owner, repo, ".clawguard/config.yml");
    if (!content) return { config: DEFAULT_CONFIG, warnings };

    const parsed = YAML.parse(content);
    const result = ClawGuardConfigSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push(`Config validation: ${result.error.message}`);
      return { config: DEFAULT_CONFIG, warnings };
    }

    // Warn about unknown fields (D-14)
    const knownFields = new Set(["autoFix", "severityThreshold", "ignorePaths", "reportSettings", "model"]);
    for (const key of Object.keys(parsed)) {
      if (!knownFields.has(key)) {
        warnings.push(`Unknown config field ignored: "${key}"`);
      }
    }

    return { config: result.data, warnings };
  } catch (err: any) {
    warnings.push(`Config read error: ${err.message}`);
    return { config: DEFAULT_CONFIG, warnings };
  }
}

// CONF-03
export async function loadPolicies(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ policies: Policy[]; warnings: string[] }> {
  const warnings: string[] = [];
  try {
    const content = await fetchRepoFile(octokit, owner, repo, ".clawguard/policies.yml");
    if (!content) return { policies: [], warnings };

    const parsed = YAML.parse(content);
    const result = PoliciesSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push(`Policies validation: ${result.error.message}`);
      return { policies: [], warnings };
    }
    return { policies: result.data.policies, warnings };
  } catch (err: any) {
    warnings.push(`Policies read error: ${err.message}`);
    return { policies: [], warnings };
  }
}
```

### Policy Injection: System Prompt Extension (CONF-04, SCAN-09)
```typescript
// lib/analysis/policy-prompt.ts
import type { Policy } from "@/lib/config";

export function buildPolicyPromptSection(policies: Policy[]): string {
  if (policies.length === 0) return "";

  const policyLines = policies.map(
    (p, i) => `${i + 1}. [${p.severity.toUpperCase()}] ${p.name}: ${p.rule}`
  );

  return [
    "",
    "## Custom Security Policies",
    "The following custom security policies MUST be enforced during analysis.",
    "Report violations as findings with the specified severity level.",
    "",
    ...policyLines,
  ].join("\n");
}
```

### BetterAuth: Server Config with Stateless Sessions
```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24, // 24h
      strategy: "jwt",
    },
  },
  account: {
    storeAccountCookie: true,
  },
  plugins: [nextCookies()],
});
```

### Dashboard: Server Component Data Fetching
```typescript
// app/dashboard/page.tsx
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getDashboardRepos } from "@/lib/redis";
import { RepoCard } from "@/components/dashboard/repo-card";
import { DashboardEmpty } from "@/components/dashboard/empty-state";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Session check in layout.tsx ensures session exists here
  const repos = await getDashboardRepos(session!.user);

  if (repos.length === 0) {
    return <DashboardEmpty />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {repos.length} {repos.length === 1 ? "repository" : "repositories"} audited
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {repos.map((repo) => (
          <RepoCard key={`${repo.owner}/${repo.name}`} repo={repo} />
        ))}
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth v4 | BetterAuth 1.5.x | User decision D-15 | Stateless sessions, no database needed, simpler setup for hackathon |
| `tailwind.config.js` | CSS-based Tailwind v4 config | Already adopted in project | Use `@theme` CSS variables, not JS config |
| `z.object()` with `.strict()` | `z.object()` with `.passthrough()` | Zod 4 convention | `.passthrough()` allows unknown fields to pass through (D-14) |
| NextAuth `middleware.ts` | BetterAuth `proxy.ts` (Next.js 16) | Next.js 16 renamed middleware | Rename `middleware.ts` to `proxy.ts`, rename export from `middleware` to `proxy` |

**Deprecated/outdated:**
- `next-auth@4`: Replaced by BetterAuth per D-15. Do not install.
- `middleware.ts` in Next.js 16: Renamed to `proxy.ts` with `proxy` export. If auth protection uses file-based middleware, use the new name.

## Open Questions

1. **BetterAuth stateless mode and GitHub access token storage**
   - What we know: BetterAuth stores OAuth account info in a cookie when `storeAccountCookie: true`. Session data includes user profile.
   - What's unclear: Whether the GitHub OAuth access token is stored in the cookie and accessible for making GitHub API calls (listing user repos for dashboard scoping). May need to extract the token during OAuth callback.
   - Recommendation: Test during implementation. If the token is not in the cookie, consider storing it in Redis keyed by user ID, or use a simple secondary storage adapter to persist the account record.

2. **Redis SCAN performance with many keys**
   - What we know: SCAN is O(1) per call but iterates the full keyspace. With few hundred audit keys this is fine.
   - What's unclear: At scale (thousands of repos, thousands of audits), SCAN with pattern matching could be slow.
   - Recommendation: Acceptable for hackathon scale. For v2, consider a Redis sorted set index `repos:{owner}` listing repo names. Not needed now.

3. **Next.js 16 `proxy.ts` vs layout-based auth checks**
   - What we know: Next.js 16 renamed `middleware.ts` to `proxy.ts`. BetterAuth docs mention both approaches: proxy-level redirects and server-component session checks.
   - What's unclear: Whether `proxy.ts` runs at edge or Node.js runtime in Next.js 16.
   - Recommendation: Use layout-based auth checks in `app/dashboard/layout.tsx` with `auth.api.getSession()`. Simpler, more predictable, and avoids edge runtime limitations. Layout runs on every dashboard navigation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Everything | Verified | >= 20.x (required by Next.js 16) | -- |
| npm | Package install | Verified | Available | -- |
| better-auth | DASH-01 auth | Not installed | 1.5.6 (npm) | Must install |
| yaml | CONF-01 config parsing | Not installed in package.json | 2.8.3 (npm) | Must install |
| Upstash Redis | CHAT-03, DASH-04 | Available (existing) | @upstash/redis 1.37.0 | -- |
| GitHub OAuth App | DASH-01 | Unknown | -- | Must configure env vars |

**Missing dependencies with no fallback:**
- `better-auth` -- must be installed via npm
- `yaml` -- must be installed via npm (verify first; may already be a transitive dep)
- GitHub OAuth App credentials (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) -- must be created in GitHub Developer Settings

**Missing dependencies with fallback:**
- None. All dependencies are installable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` (runs `vitest run`) |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Follow-up question triggers AI response for `unknown` intent | unit | `npx vitest run tests/chat.test.ts -x` | No - Wave 0 |
| CHAT-02 | AI response includes audit context and security expertise | unit | `npx vitest run tests/chat.test.ts -x` | No - Wave 0 |
| CHAT-03 | Conversation history stored/retrieved from Redis | unit | `npx vitest run tests/chat.test.ts -x` | No - Wave 0 |
| CHAT-04 | Fix via chat (already works via detectIntent) | unit | `npx vitest run tests/bot.test.ts -x` | Yes (existing) |
| CONF-01 | Config reader fetches YAML from repo via Octokit | unit | `npx vitest run tests/config.test.ts -x` | No - Wave 0 |
| CONF-02 | Config schema validates all supported fields | unit | `npx vitest run tests/config.test.ts -x` | No - Wave 0 |
| CONF-03 | Policies reader fetches and parses policies YAML | unit | `npx vitest run tests/config.test.ts -x` | No - Wave 0 |
| CONF-04 | Policies injected into agent system prompt | unit | `npx vitest run tests/config.test.ts -x` | No - Wave 0 |
| CONF-05 | Defaults used when no config files exist | unit | `npx vitest run tests/config.test.ts -x` | No - Wave 0 |
| SCAN-09 | Custom policies in system prompt (same as CONF-04) | unit | `npx vitest run tests/config.test.ts -x` | No - Wave 0 |
| DASH-01 | BetterAuth GitHub OAuth setup | manual-only | Manual: visit /dashboard, verify redirect to GitHub OAuth | -- |
| DASH-02 | Dashboard overview shows repo cards | manual-only | Manual: verify grid renders with mock data | -- |
| DASH-03 | Per-repo page shows audit table | manual-only | Manual: verify table renders with mock data | -- |
| DASH-04 | Dashboard reads from Redis | unit | `npx vitest run tests/redis.test.ts -x` | Partial (existing, needs extension) |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/chat.test.ts` -- covers CHAT-01, CHAT-02, CHAT-03
- [ ] `tests/config.test.ts` -- covers CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, SCAN-09
- [ ] Extend `tests/redis.test.ts` -- add `scanAuditKeys` and `getRepoAudits` tests for DASH-04

## Sources

### Primary (HIGH confidence)
- BetterAuth official docs (https://www.better-auth.com/docs/installation) -- installation, API route setup, Next.js integration
- BetterAuth GitHub OAuth (https://www.better-auth.com/docs/authentication/github) -- provider configuration
- BetterAuth Next.js integration (https://www.better-auth.com/docs/integrations/next) -- toNextJsHandler, proxy.ts, server session access
- BetterAuth session management (https://www.better-auth.com/docs/concepts/session-management) -- stateless mode, cookie cache, secondary storage
- BetterAuth database docs (https://www.better-auth.com/docs/concepts/database) -- stateless mode, no-DB operation
- BetterAuth client docs (https://www.better-auth.com/docs/concepts/client) -- useSession, signIn.social, signOut
- Upstash Redis SCAN docs (https://upstash.com/docs/redis/sdks/ts/commands/generic/scan) -- cursor-based scan with pattern
- yaml package docs (https://eemeli.org/yaml/) -- YAML.parse(), error handling, TypeScript support
- AI SDK generateText docs (https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) -- one-shot text generation
- npm registry -- verified versions: better-auth 1.5.6, yaml 2.8.3, @upstash/redis 1.37.0

### Secondary (MEDIUM confidence)
- Existing codebase patterns (bot.ts, redis.ts, pipeline.ts, report page.tsx) -- established patterns for similar features
- CLAUDE.md technology stack -- version specifications and compatibility notes

### Tertiary (LOW confidence)
- BetterAuth `nextCookies()` plugin -- docs returned 404 at expected URL. Plugin existence confirmed via session management page but exact import path needs verification during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages verified via npm registry, existing project dependencies confirmed
- Architecture: HIGH - patterns derived directly from existing codebase (bot.ts, redis.ts, report page.tsx)
- BetterAuth setup: MEDIUM - official docs verified, but stateless mode + GitHub OAuth token access in cookie needs runtime verification
- Pitfalls: HIGH - derived from official docs and common integration patterns

**Research date:** 2026-03-28
**Valid until:** 2026-04-04 (7 days -- BetterAuth is actively developed, verify stateless API if delayed)
