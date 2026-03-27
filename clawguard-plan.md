# 🛡️ ClawGuard — OpenClaw Hack_001 Battle Plan (v3 FINAL)

> Feed this entire document to Claude Code / Cursor as project context.
> It contains everything needed to build ClawGuard from scratch.

---

## 1. WHAT WE'RE BUILDING

**ClawGuard** is an AI-powered security agent that reviews GitHub PRs, finds vulnerabilities, auto-fixes and commits them, and generates stunning interactive security reports — all from a single Next.js deployment.

### Three Surfaces

**Surface 1 — GitHub PR Thread.** Developer @mentions `@clawguard` on a PR. The bot runs a 3-phase security audit in a sandboxed environment, then posts a summary card (security score, severity counts, top findings) with a link to the full interactive report. The developer can chat with the bot in the thread for follow-ups. The bot can also generate fixes and commit them directly to the PR branch, then re-audit — behaving like a cloud coding agent that iterates on the PR until the code is clean.

**Surface 2 — Interactive Web Report.** Each PR audit generates a unique report page at `/report/[owner]/[repo]/[pr]`. This is a beautifully designed, interactive security dashboard built with shadcn/ui components. It includes: a security score gauge (A–F), expandable finding cards with data flow Mermaid diagrams and before/after code diffs, an OWASP Top 10 distribution chart, a threat model view with Mermaid attack path diagrams, and a compliance mapping table. Reports are generated/refined using the v0 SDK to ensure they look insanely professional and maintain a consistent design system. Every report is shareable via URL.

**Surface 3 — Dashboard.** A web app where users log in with GitHub OAuth and see all their connected repositories, each repo's PR audit threads, interaction history, and security score trends over time. This is the "product" view that makes judges see ClawGuard as a real SaaS.

---

## 2. HACKATHON CONTEXT

| | |
|---|---|
| **Event** | OpenClaw Hack_001 — Vienna's First Overnight AI Agent Hackathon |
| **Tracks** | Track 1: OpenClaw & Agents · Track 2: Cybersecurity (we target both) |
| **Team** | 3–4 people, TypeScript/React full-stack |
| **Judges** | **Alexis Lingad** (cybersecurity — top competitive hacker globally), **Arvind Anandakumar** (AI agents — neural memory for agents), **Mojmír Horváth** (AI — PothAI, YC S26), Dr Birgitta Olofsson (biotech), Michael Dao (healthcare) |
| **Prizes** | Maritime $500/$250/$100 OpenAI credits · ElevenLabs tiers (Creator for all, Pro for winners, Scale for best ElevenLabs project) · Cash TBA |
| **Sponsors** | HOIV · Fiskaly · AIMx · Maritime · Texterous · Proximata |

### Why This Wins

- **Only Track 1 × Track 2 crossover.** It IS an autonomous agent (multi-step tool use, sandbox execution, agentic fix loop, conversation memory) AND a cybersecurity tool (vuln detection, CWE/OWASP mapping, threat modeling, compliance mapping). Both sets of judges can claim it.
- **Alexis Lingad** (cybersecurity judge, competitive hacker) can click into the interactive report and explore real findings — data flows, attack scenarios, CWE classifications. This speaks his language.
- **Arvind Anandakumar** (agents judge) sees the agentic loop: clone → diff → analyze → fix → validate → commit → re-audit → iterate. Real agent autonomy with tool use.
- **Mojmír Horváth** (YC founder) sees a product. The dashboard, the report, the config system — this looks like a SaaS, not a hackathon toy.

---

## 3. ARCHITECTURE

### Single Next.js Deployment

Everything lives in one Next.js app deployed to Vercel. No separate Hono server.

**`/app/api/webhooks/github/route.ts`** — The GitHub webhook endpoint. Uses the Chat SDK's GitHub adapter. Uses `waitUntil` from `@vercel/functions` to keep the serverless function alive while the review runs in the background. This replaces the Hono server from the Chat SDK code review guide — same pattern, just inside a Next.js Route Handler instead.

**`/app/api/reports/[id]/route.ts`** — API endpoint that serves stored audit JSON for the report page.

**`/app/api/auth/[...nextauth]/route.ts`** — GitHub OAuth via NextAuth.js for the dashboard.

**`/app/report/[owner]/[repo]/[pr]/page.tsx`** — Public interactive report page. Reads audit data from the API and renders the full security dashboard with shadcn components, Mermaid diagrams, and Recharts charts.

**`/app/dashboard/page.tsx`** — Authenticated dashboard. Shows all connected repos, audit history, score trends.

**`/app/dashboard/[owner]/[repo]/page.tsx`** — Per-repo view with all PR audits and trend data.

**`/lib/bot.ts`** — Chat SDK instance with GitHub adapter and Redis state. Handles `onNewMention`, `onSubscribedMessage`, and `onAction` events.

**`/lib/review.ts`** — The 3-phase security analysis pipeline using Vercel Sandbox + AI SDK ToolLoopAgent + bash-tool.

**`/lib/fix.ts`** — Auto-fix logic: agent generates fix in sandbox, validates (linter/tsc), commits to PR branch via Octokit.

**`/lib/report-generator.ts`** — v0 SDK integration for generating/refining interactive report components.

**`/lib/config-reader.ts`** — Reads `.clawguard/config.yml` and `.clawguard/policies.yml` from the repo via Octokit.

### Data Flow

1. Developer @mentions `@clawguard` on a GitHub PR
2. GitHub webhook POST → `/api/webhooks/github/route.ts`
3. Chat SDK GitHub adapter parses event, fires `onNewMention`
4. Bot reads `.clawguard/config.yml` and `.clawguard/policies.yml` from the repo via Octokit
5. Vercel Sandbox clones the repo, checks out the PR branch
6. ToolLoopAgent (Claude Sonnet 4.6) runs the 3-phase security audit with bash/readFile/writeFile tools
7. Agent outputs structured JSON → stored in Redis (keyed by `{owner}/{repo}/pr/{number}`)
8. v0 SDK generates/refines the interactive report (consistent system prompt for design)
9. Bot posts a JSX summary Card in the PR thread with a "View Full Report →" link
10. Developer can chat with the bot, request explanations, or trigger auto-fixes
11. On "fix": agent generates fix in sandbox → validates → commits to PR branch → re-audits

---

## 4. TECH STACK

| Layer | Technology |
|---|---|
| **Framework** | Next.js (App Router) |
| **Chat Bot** | Vercel Chat SDK (`chat`) + `@chat-adapter/github` + `@chat-adapter/state-redis` |
| **AI Engine** | AI SDK `ToolLoopAgent` with `anthropic/claude-sonnet-4.6` via Vercel AI Gateway |
| **Sandbox** | `@vercel/sandbox` for isolated repo cloning and code analysis |
| **Agent Tools** | `bash-tool` (provides bash, readFile, writeFile scoped to sandbox) |
| **GitHub API** | `@octokit/rest` for PR metadata, file contents, committing fixes |
| **Report Gen** | `v0-sdk` + `@v0-sdk/react` for generating interactive report UI |
| **UI** | shadcn/ui (Card, Badge, Tabs, Table, Accordion, Dialog, Separator) + Tailwind CSS |
| **Charts** | Recharts (OWASP distribution, severity breakdown, score trends) |
| **Diagrams** | Mermaid (data flow diagrams, attack path diagrams, threat models) |
| **Auth** | NextAuth.js with GitHub OAuth provider |
| **State** | Upstash Redis (stores audit results, conversation state, config cache) |
| **Deploy** | Vercel (single deployment, everything in one app) |

### Key References

- **Chat SDK code review guide** (the foundation for the bot): `https://chat-sdk.dev/docs/guides/code-review-hono` — Follow this exact pattern but adapt it to a Next.js Route Handler instead of Hono. The review function, sandbox setup, ToolLoopAgent configuration, and bot event handlers are directly from this guide.
- **Chat SDK Cards** (for JSX summary output): `https://chat-sdk.dev/docs/cards` — Card, CardText, Fields, Field, Table, Actions, Button, LinkButton, Divider components. Requires `jsxImportSource: "chat"` in tsconfig.
- **Chat SDK Streaming** (for real-time output): `https://chat-sdk.dev/docs/streaming` — Pass `result.fullStream` directly to `thread.post()` for streaming. Use `fullStream` not `textStream` to preserve step boundaries.
- **Chat SDK Actions** (for button handlers): `https://chat-sdk.dev/docs/actions` — `onAction` handler fires when user clicks a Button. The `actionId` matches the button's `id` prop.
- **v0 SDK** (for report generation): `https://v0.dev/docs/api/platform` — Use `v0.chats.create({ system, message })` with a consistent system prompt for styling. The `system` parameter provides design context. Use `designSystemId` if available. Access generated files via `chat.files` or embed via `chat.latestVersion?.demoUrl` in an iframe.
- **v0 SDK Init with files** (for template baselines): `https://v0.app/docs/api/platform/reference/chats/init` — Use `v0.chats.init({ type: 'files', files: [...] })` to provide baseline template files (globals.css, shared components) so every generated report has a consistent foundation.

---

## 5. `.clawguard` CONFIG SYSTEM

The configuration lives in the repository being reviewed, inside a `.clawguard/` folder. The agent reads this config before starting the audit. If no config exists, sensible defaults are used.

### `.clawguard/config.yml`

Controls overall behavior:

- **autoFix.enabled** (boolean) — Whether ClawGuard can commit fixes to the PR branch. Default: `true`.
- **autoFix.commitDirectly** (boolean) — Commit to the PR branch (true) or suggest only (false). Default: `true`.
- **autoFix.maxFixesPerRun** (number) — Safety limit on fixes per audit. Default: `10`.
- **autoFix.requireValidation** (boolean) — Run linter/type-checker before committing. Default: `true`.
- **thresholds.blockMerge** (severity) — Block the PR if findings at this severity or above exist. Default: `CRITICAL`.
- **thresholds.requestChanges** (severity) — Request changes at this level. Default: `HIGH`.
- **thresholds.commentOnly** (severity) — Only comment, don't block. Default: `MEDIUM`.
- **ignorePaths** (glob array) — Files/directories to skip during analysis. Default: test files, fixtures, mocks, docs.
- **report.generateInteractiveReport** (boolean) — Whether to generate the web report. Default: `true`.
- **report.frameworks** (string array) — Which compliance frameworks to map against. Default: `["OWASP", "PCI-DSS", "SOC2"]`.
- **model.provider** (string) — AI provider override. Default: `"anthropic"`.
- **model.model** (string) — Model override. Default: `"claude-sonnet-4.6"`.
- **model.maxSteps** (number) — Maximum ToolLoopAgent steps. Default: `20`.

### `.clawguard/policies.yml`

Custom security rules that the agent enforces alongside standard OWASP checks. Each policy has a name, a natural-language rule description, and a severity level. Examples:

- "No eval in production" — CRITICAL — Never allow eval(), new Function(), or vm.runInNewContext() outside test directories
- "No raw SQL" — HIGH — All database queries must use parameterized queries or an ORM
- "No PII logging" — HIGH — Never log credit card numbers, SSNs, passwords, or emails
- "Auth middleware required" — CRITICAL — All /api/admin/* routes must have authentication middleware
- "No hardcoded URLs" — MEDIUM — API base URLs must come from environment variables

The config reader fetches these files from the repo via Octokit before the audit starts. Policies are injected into the ToolLoopAgent's system prompt so the LLM enforces them during analysis.

---

## 6. THE AGENT: 3-Phase Security Pipeline

The core analysis uses the exact pattern from the Chat SDK code review guide: Vercel Sandbox clones the repo → ToolLoopAgent with bash/readFile/writeFile tools analyzes the code → structured JSON output.

### What the agent does

**Phase 1 — Code Quality Review.** Summarize the PR in 2-3 sentences. Identify code smells, architectural impact, maintainability issues.

**Phase 2 — Security Vulnerability Scan.** Check for: injection flaws (SQL, NoSQL, OS command, XSS, SSRF), hardcoded secrets/credentials (regex + entropy patterns), authentication/authorization gaps, CSRF, IDOR, path traversal, insecure deserialization, unsafe eval(), sensitive data exposure, PII logging, insecure crypto, race conditions, open redirects, missing input validation, dependency vulnerabilities. Also enforce any custom policies from `.clawguard/policies.yml`. For each finding, output: severity, type, exact file:line location, CWE ID, OWASP Top 10 2021 category, description, concrete attack scenario, data flow chain (source → transform → sink), before/after code fix with explanation, and compliance framework mapping.

**Phase 3 — Threat Model.** Map all attack surfaces introduced by the PR. Generate a Mermaid diagram showing data flow and attack paths. Assess compound risk (e.g., SQLi + hardcoded creds = critical escalation path). Provide overall risk assessment with merge recommendation.

### Output format

The agent outputs a single structured JSON object containing: summary, security score (A-F grade, 0-100 numeric), array of findings (each with all the fields above), threat model (attack surfaces, Mermaid diagram source, overall risk), and metadata (timestamp, files changed, lines changed). This JSON is stored in Redis and consumed by the report page.

### Scoring formula

Start at 100. Deduct: CRITICAL = -25, HIGH = -15, MEDIUM = -8, LOW = -3, INFO = -1. Grade: A = 90-100, B = 80-89, C = 65-79, D = 40-64, F = 0-39.

---

## 7. AUTO-FIX & COMMIT (Agentic Loop)

This is the feature that makes ClawGuard behave like a cloud coding agent (think Cursor, Copilot, CodeRabbit) rather than a passive scanner.

### Flow

1. User clicks "Auto-Fix" button in the PR summary card, or types "fix the SQL injection" in the thread
2. Bot posts "🔧 Generating fix for: SQL Injection in src/api/users.ts..."
3. A new Vercel Sandbox is created, repo is cloned, PR branch checked out
4. A ToolLoopAgent (with bash, readFile, writeFile tools) is given the specific finding and instructed to: read the vulnerable file → apply the fix using writeFile → run validation (tsc --noEmit, npm run lint, or whatever's available) → iterate if the fix causes errors
5. Once the fix passes validation, the fixed file content is read from the sandbox
6. The fix is committed directly to the PR branch via Octokit's Contents API with a descriptive commit message: `fix(security): parameterize SQL query in users.ts [CWE-89]`
7. Bot confirms in the thread: "✅ Fix committed"
8. If "fix all" was requested, repeat for each CRITICAL and HIGH finding
9. After all fixes are committed, the bot re-runs the full security audit on the updated code
10. A new summary card is posted showing the improved score

### Why this impresses judges

This demonstrates real agent autonomy — the agent doesn't just find problems, it fixes them, validates the fixes, commits them, and then re-evaluates. It's a complete agentic loop that mirrors how human developers work with AI coding assistants. The agents judge (Arvind) will immediately see the sophistication.

---

## 8. INTERACTIVE WEB REPORT (The Centerpiece)

The report page at `/report/[owner]/[repo]/[pr]` is the visual wow factor. It reads the stored audit JSON and renders a full interactive security dashboard.

### Design System

- Dark theme (near-black background, high contrast)
- shadcn/ui components throughout (Card, Badge, Tabs, Table, Accordion, Separator, Dialog)
- Tailwind CSS for layout and custom styling
- Recharts for charts
- Mermaid for all diagrams
- Professional, dense, information-rich — think "enterprise security tool" not "hackathon project"

### Report Sections

**Header.** ClawGuard logo/brand, repo name, PR title and number, audit timestamp.

**Security Score Gauge.** Large circular gauge showing the A-F grade with color coding (green A/B, amber C, red D/F). Numeric score displayed inside. Severity breakdown badges next to it (🔴 2 Critical, 🟠 3 High, 🟡 2 Medium).

**OWASP Top 10 Distribution.** Horizontal bar chart (Recharts) showing how many findings fall into each OWASP category. Visual at-a-glance view of where the vulnerabilities cluster.

**Findings Tab.** Expandable finding cards, one per vulnerability. Each card shows:
- Severity badge (color-coded), vulnerability type, file:line location, CWE/OWASP tags
- On expand: full description, Mermaid data flow diagram (source → transform → sink), attack scenario (red-bordered callout box), before/after code diff with syntax highlighting, compliance impact badges (PCI DSS, SOC 2, etc.)

**Threat Model Tab.** Attack surface entries with risk ratings. Mermaid diagram showing the overall attack path across all findings. Overall risk assessment with merge recommendation.

**Compliance Tab.** Full table mapping every finding to regulatory frameworks: columns for Finding, CWE, PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS.

### v0 SDK Integration

The v0 SDK is used to generate and refine the report components with a consistent system prompt that specifies the design system (dark theme, shadcn, Mermaid, Recharts). The `system` parameter in `v0.chats.create()` provides this context. Template baseline files can be provided via `v0.chats.init({ type: 'files' })` to ensure consistent globals.css, shared component patterns, and theme variables across all generated reports. The generated output can be embedded via `chat.latestVersion?.demoUrl` in an iframe, or the generated files can be extracted via `chat.files` and integrated directly into the Next.js app.

For the hackathon, the pragmatic approach is: use v0 to design and iterate on the report components during development (vibe-code them until they look perfect), then lock in the final shadcn components in the codebase. The v0 SDK can also be called at runtime to refine or regenerate specific report sections based on the audit data, but pre-built components are safer for a live demo.

### Mermaid Diagrams (specifically)

Every finding includes a Mermaid data flow diagram in its JSON. The report page renders these using the Mermaid library. Example for an SQL injection finding:

```
graph LR
    A[req.body.email] -->|unsanitized| B[String interpolation]
    B -->|injected| C[db.query]
    C --> D[(Database)]
    style A fill:#f55,color:#fff
    style C fill:#f95,color:#fff
    style D fill:#5a5,color:#fff
```

The threat model section includes a larger Mermaid diagram showing the overall attack graph across all findings — how an attacker could chain vulnerabilities together.

---

## 9. DASHBOARD

### Authentication

GitHub OAuth via NextAuth.js. User logs in with their GitHub account. The dashboard shows repos they have access to.

### Pages

**`/dashboard`** — Overview. Grid of connected repo cards. Each card shows: repo name, last audit date, latest security score, number of open findings. Filter/search bar.

**`/dashboard/[owner]/[repo]`** — Repo detail. List of all PR audits for this repo, sorted by date. Each entry shows: PR number/title, security score, severity counts, link to full report. Score trend chart (Recharts) showing how the repo's security posture has evolved across PRs.

### Data

The dashboard reads from the same Redis store where audit results are saved. Each audit is keyed by `{owner}/{repo}/pr/{number}`. The dashboard aggregates across PRs for trend data.

---

## 10. VULNERABLE DEMO REPOSITORY

Create a repo called `techcorp-api` with three pre-built PRs containing planted vulnerabilities. This is the demo repo — ClawGuard will be run against it live during the presentation.

### PR #1: "Add user authentication"
- SQL injection in login query (user input interpolated directly into SQL string)
- Hardcoded JWT secret and AWS access key as string literals
- No rate limiting on the authentication endpoint

### PR #2: "Add file upload endpoint"
- Path traversal via unsanitized filename parameter in file write
- Reflected XSS via user-controlled query parameter in HTML response
- Missing authentication middleware on admin DELETE route

### PR #3: "Add payment processing"
- SSRF via user-controlled webhook URL parameter fetched server-side
- Insecure deserialization with eval() on user-supplied data
- Credit card numbers logged to console in payment handler
- Missing CSRF protection on state-changing POST endpoint

---

## 11. TEAM ROLE ASSIGNMENTS

### Person 1: "The Agent Engineer" (strongest backend TS dev)
Owns: ToolLoopAgent pipeline, system prompt, Vercel Sandbox, structured JSON output, auto-fix + commit logic.

- Hours 0–2: Scaffold Next.js app, set up webhook route handler with Chat SDK GitHub adapter, verify webhook delivery from demo repo
- Hours 2–8: Build the 3-phase review pipeline (sandbox clone, ToolLoopAgent, structured JSON output), iterate on the system prompt until it produces accurate findings against the demo repo
- Hours 8–12: Build the auto-fix + commit flow (sandbox → fix → validate → commit via Octokit), test the full agentic loop
- Hours 12–16: Implement `onSubscribedMessage` for follow-up chat with conversation history via `toAiMessages()`, implement action button handlers
- Hours 16–20: Polish: config reader integration, custom policy enforcement, edge cases, re-audit after fixes
- Hours 20–24: Bug fixes, demo prep

### Person 2: "The Report UI Engineer" (strongest frontend/React dev)
Owns: Interactive report page, all shadcn components, Mermaid integration, Recharts charts, v0 SDK for design iteration.

- Hours 0–2: Set up shadcn/ui, Tailwind dark theme, base layout for report page
- Hours 2–8: Build the core report components: security score gauge, severity badges, expandable finding cards, before/after code diff viewer, Mermaid diagram rendering
- Hours 8–12: Build OWASP distribution chart (Recharts), threat model tab with Mermaid attack path, compliance mapping table
- Hours 12–16: Use v0 SDK to refine/iterate on the design — vibe-code the components until they look insanely professional, then lock them in
- Hours 16–20: Wire to real data (fetch audit JSON from API), unique report URLs, responsive polish
- Hours 20–24: Final visual polish, deploy

### Person 3: "The Integration & Demo Engineer"
Owns: GitHub JSX Card output, data pipeline (agent → store → report), demo repo, config system, dashboard.

- Hours 0–4: Create the `techcorp-api` demo repo with 3 PRs containing planted vulnerabilities. Create the `.clawguard/config.yml` and `.clawguard/policies.yml` files.
- Hours 4–8: Build the JSX summary Card (using Chat SDK Card components), wire the "View Full Report →" link generation, build the API endpoint for serving audit JSON
- Hours 8–12: Build the config reader (fetches .clawguard files from repo via Octokit, parses YAML, merges with defaults)
- Hours 12–16: End-to-end testing: @mention on demo repo → agent runs → card posted → report renders with real data
- Hours 16–20: Build the dashboard: GitHub OAuth login, repo list, audit history page, score trend chart
- Hours 20–24: README, architecture diagram, demo rehearsal

### Person 4 (if available): "The DevOps & Polish Engineer"
Owns: Deployment, streaming UX, documentation, demo production.

- Hours 0–4: Vercel deployment pipeline, Upstash Redis setup, ngrok tunnel for local dev
- Hours 4–10: Streaming progress in PR thread (task updates as agent works through phases), error handling, timeout management
- Hours 10–16: Documentation: README with setup instructions, architecture diagram, screenshots
- Hours 16–20: Maritime.sh deployment (Docker container, show sponsor platform usage), demo video recording
- Hours 20–24: Demo rehearsal (twice), backup screenshots, submission

---

## 12. THE DEMO SCRIPT (3 minutes)

### Opening (30 sec)
"Every day, developers merge code with hidden security vulnerabilities. Existing tools give you either a scan with no context, or a code review with no security depth. ClawGuard is an AI security agent that reviews your PRs, finds vulnerabilities, fixes them, and generates interactive reports you can explore — all from a single deployment."

### Live Demo (2 min)

1. **Show the PR** — open PR #1 in techcorp-api with SQL injection, hardcoded AWS keys, and missing rate limiting (10 sec)

2. **Trigger the bot** — comment `@clawguard review this PR` (5 sec)

3. **Watch the streaming audit** — bot posts progress as it clones, analyzes, scans. Summary Card appears: Grade D, 2 Critical, 3 High. Point out the JSX Card with severity badges and findings table. (25 sec)

4. **Click "View Full Report →"** — the interactive report opens. This is the demo climax. (5 sec)

5. **Walk through the report** — show the Security Score gauge. Expand the SQL injection finding: description, Mermaid data flow diagram (req.body.email → string interpolation → db.query()), attack scenario, before/after code diff. (25 sec)

6. **Switch to Threat Model tab** — show the Mermaid attack path diagram. "The SQL injection combined with hardcoded credentials creates a compound escalation path." (10 sec)

7. **Switch to Compliance tab** — show the PCI DSS / SOC 2 mapping table. (10 sec)

8. **Trigger auto-fix** — click "Auto-Fix All" button. Bot commits fixes to the PR branch, re-runs the audit. New score: B (82/100). "ClawGuard doesn't just find problems — it fixes them." (20 sec)

9. **Show the dashboard** — briefly flash the dashboard with connected repos and audit history. (10 sec)

### Close (30 sec)
"ClawGuard combines the depth of Snyk with the conversational intelligence of CodeRabbit — plus auto-fix, interactive reports, and a full dashboard that neither offers. It's built with Vercel's Chat SDK and deployed on a single Next.js app. Configuration lives in the repo, fixes commit to the branch, and every audit generates a shareable report. It's live right now."

---

## 13. PRIORITY CUT LIST

If running out of time, cut features in this order (bottom = cut first):

1. ~~Maritime.sh deployment~~ (nice sponsor signal but not critical)
2. ~~Dashboard score trend chart~~ (static list of audits is fine)
3. ~~Dashboard~~ entirely (report pages + GitHub bot is enough to win)
4. ~~v0 SDK runtime generation~~ (pre-built shadcn components work fine)
5. ~~Custom policies from .clawguard/policies.yml~~ (standard OWASP checks still work)
6. ~~Re-audit after fix~~ (just show the fix commit, skip the re-run)
7. ~~Compliance mapping tab~~ (findings + threat model is enough)

**NEVER CUT:** Core 3-phase review → JSX summary card → interactive report page with findings + Mermaid diagrams → auto-fix + commit → follow-up chat

---

## 14. PRE-HACKATHON CHECKLIST (Tonight)

- [ ] Create the ClawGuard GitHub repo, scaffold Next.js app with shadcn/ui and Tailwind dark theme
- [ ] Create the `techcorp-api` demo repo with 3 PRs containing planted vulnerabilities (have actual code files with the bugs, not just descriptions)
- [ ] Add `.clawguard/config.yml` and `.clawguard/policies.yml` to the demo repo
- [ ] Set up the GitHub webhook on the demo repo pointing to a placeholder URL
- [ ] Create Upstash Redis instance (free tier)
- [ ] Set up Vercel account with billing enabled (needed for Sandbox)
- [ ] Get a v0 API key from v0.dev/chat/settings/keys
- [ ] Set up GitHub OAuth app for the dashboard (Settings → Developer Settings → OAuth Apps)
- [ ] Run `pnpm create next-app` and verify the base app deploys to Vercel
- [ ] Read and bookmark these Chat SDK docs pages:
  - `https://chat-sdk.dev/docs/guides/code-review-hono` (the bot foundation)
  - `https://chat-sdk.dev/docs/cards` (JSX Card API)
  - `https://chat-sdk.dev/docs/streaming` (streaming + fullStream)
  - `https://chat-sdk.dev/docs/actions` (button handlers)
  - `https://chat-sdk.dev/docs/handling-events` (onNewMention, onSubscribedMessage)
- [ ] Read and bookmark the v0 SDK docs:
  - `https://v0.dev/docs/api/platform/quickstart`
  - `https://v0.dev/docs/api/platform/chats/create` (system prompt, designSystemId)
  - `https://v0.app/docs/api/platform/reference/chats/init` (template baselines with files)
- [ ] Draft the agent system prompt in a text file and iterate on wording
- [ ] Test: open a PR on the demo repo, verify the webhook fires (even if to a 404 — confirms delivery works)

---

## 15. PRIZE STRATEGY

| Prize | Strategy |
|---|---|
| **Track 1+2 Grand Prize** | Only project fusing agents WITH cybersecurity. Interactive report + agentic fix loop = product-grade execution. |
| **Maritime Credits ($500/$250/$100)** | Deploy to Maritime.sh if time permits. Their founding team (MIT) is speaking at the event — using their platform is a direct signal. |
| **ElevenLabs** | Not targeting their best-project prize (we dropped voice). Every participant gets Creator tier anyway. |
| **Cash (TBA)** | Overall quality + live demo + wow factor. The interactive report IS the wow factor. |
