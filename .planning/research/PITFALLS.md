# Pitfalls Research

**Domain:** AI-powered GitHub PR security review agent (hackathon build)
**Researched:** 2026-03-27
**Confidence:** HIGH (verified against Vercel, GitHub, AI SDK official docs)

## Critical Pitfalls

### Pitfall 1: Serverless Function Timeout vs. Multi-Step Agent Execution

**What goes wrong:**
The ToolLoopAgent runs a 3-phase security pipeline (code quality, vulnerability scan, threat model) with multiple tool calls per phase. Each tool call round-trips to the LLM plus executes sandbox commands. A single webhook-triggered audit can easily take 2-5 minutes. If your route handler is the one orchestrating the full pipeline synchronously, Vercel will terminate it when `maxDuration` is reached. With Fluid Compute (enabled by default since April 2025), defaults are 300s/5min for all plans, max 800s/13min on Pro/Enterprise. This is generous but the real danger is: the **webhook response** to GitHub must happen within 10 seconds or GitHub considers the delivery failed and may retry, causing duplicate processing.

**Why it happens:**
Developers treat the webhook handler as both "acknowledge receipt" AND "run the full pipeline." GitHub expects a fast 2xx response. The long-running agent work must happen asynchronously.

**How to avoid:**
1. Webhook route returns 200 immediately after signature verification and event parsing. Store the job in Redis with status "queued."
2. Use `waitUntil()` from `@vercel/functions` to kick off the actual analysis pipeline after the response is sent. `waitUntil` keeps the function alive for up to the `maxDuration` limit but lets you respond to GitHub instantly.
3. Set `export const maxDuration = 300` (or up to 800 on Pro) on the webhook route to allow the background work time to complete.
4. For the agent itself, set `stopWhen: stepCountIs(N)` (AI SDK pattern) with N=10-15 to bound each phase and prevent infinite loops.

**Warning signs:**
- GitHub webhook delivery page shows "timed out" or repeated deliveries
- Agent analysis never completes; Redis state stuck in "processing"
- Vercel function logs show `FUNCTION_INVOCATION_TIMEOUT`

**Phase to address:** Phase 1 (Infrastructure/Webhook setup)

---

### Pitfall 2: ToolLoopAgent Produces Unparseable or Schema-Violating Output

**What goes wrong:**
The security pipeline needs structured JSON output with findings arrays, severity enums, CWE codes, OWASP mappings, and numeric scores. The AI SDK throws `AI_NoObjectGeneratedError` when: (a) the model produces no response, (b) output cannot be parsed, or (c) output fails schema validation. In practice, the model may return markdown-wrapped JSON, truncated output on long analyses, or hallucinated field names that violate the Zod schema. During a hackathon demo, a single schema validation failure in the pipeline kills the entire audit.

**Why it happens:**
Complex, deeply nested schemas with many required fields are hard for models to satisfy consistently. Large PRs produce long analyses that may get truncated. Tool call results feeding back into the model can confuse the structured output generation. Adding too many `.describe()` hints bloats the system prompt.

**How to avoid:**
1. Define a Zod schema but keep it flat-ish. Use `z.array(FindingSchema)` at the top level rather than deeply nested objects. Add `.describe()` only on ambiguous fields.
2. Use `Output.object` mode (not free-form JSON) so the AI SDK validates against your schema.
3. Implement a fallback parser: catch `AI_NoObjectGeneratedError`, inspect `error.text` (the raw model output), and attempt manual JSON extraction with regex + `JSON.parse` before declaring failure.
4. For the demo, pre-test your exact schema against 3+ different PR diffs to find edge cases. Adjust schema to be more lenient where needed (make some fields optional with `.optional()`).
5. Set reasonable `maxTokens` per generation call (4000-6000) to avoid truncation while keeping responses focused.

**Warning signs:**
- Zod parse errors in function logs
- Findings array is empty when it should not be
- Scores return as `null` or `undefined` in the report
- Inconsistent field names between runs (e.g., `cweId` vs `cwe_id`)

**Phase to address:** Phase 2 (Agent pipeline implementation)

---

### Pitfall 3: Auto-Fix Commits That Break the PR or Fail Validation

**What goes wrong:**
The agent generates code fixes in the Vercel Sandbox, then commits them to the PR branch via the GitHub Git Data API (create blob, create tree, create commit, update ref). Common failures: (a) the fix introduces syntax errors or new bugs, (b) the commit overwrites concurrent changes because the parent SHA is stale, (c) the tree construction is wrong because the agent modified files that were not in the original diff, (d) the fix looks correct in isolation but breaks imports/dependencies. During a demo, a broken auto-fix that fails CI is worse than no fix at all.

**Why it happens:**
LLMs generate plausible-looking code that may not compile. The Git Data API is low-level -- you must build trees from blobs, set correct parent SHAs, and handle file paths precisely. Race conditions occur if a developer pushes to the branch between when the agent reads it and when it commits.

**How to avoid:**
1. **Validate in sandbox first:** After the agent generates a fix, run a syntax check in the Vercel Sandbox (`node --check file.js` for JS/TS, or a lightweight linter) before committing. Only commit if validation passes.
2. **Use the Contents API for simple fixes** (`PUT /repos/{owner}/{repo}/contents/{path}`) instead of the full Git Data API when fixing single files. It handles SHA management automatically.
3. **Always fetch the latest HEAD SHA** of the branch immediately before creating the commit, not at the start of analysis. Compare with expected SHA; abort if the branch moved.
4. **Scope fixes conservatively for the demo:** Only auto-fix obvious issues (SQL injection parameterization, XSS escaping, hardcoded secrets) where the fix pattern is well-defined. Skip "refactoring" style fixes that touch multiple files.
5. **Post the fix diff as a PR comment first** before committing, so during the demo you can show the proposed fix even if committing fails.

**Warning signs:**
- 409 Conflict responses from GitHub API on commit creation
- Auto-fixed code has syntax errors visible in the diff
- CI checks fail after auto-fix commits
- File paths in the tree do not match the actual repo structure

**Phase to address:** Phase 3 (Auto-fix loop)

---

### Pitfall 4: Vercel Sandbox Cold Start and Reliability During Live Demo

**What goes wrong:**
Vercel Sandbox runs Firecracker microVMs. The docs claim "millisecond startup" but real-world first invocations involve: creating the sandbox, cloning the repo (`git clone`), installing dependencies (if needed), and running analysis commands. This can take 10-30 seconds on a cold path. During a live demo, the audience watches dead air. Worse, the Sandbox is only available in the `iad1` region (US East). If the hackathon is in Vienna, every sandbox API call has 100-150ms transatlantic latency on top of execution time.

**Why it happens:**
Sandbox creation is fast but repo cloning, `git checkout`, and file I/O add up. The single-region limitation means geographic latency is unavoidable. Network variability at hackathon venues (shared WiFi) compounds the problem.

**How to avoid:**
1. **Use snapshots.** Create a sandbox snapshot with the demo repo already cloned and dependencies installed. Restoring from a snapshot skips the clone step entirely.
2. **Pre-warm before the demo.** 5 minutes before presenting, trigger a dummy audit to ensure sandbox instances are warm and any cached state is fresh.
3. **Show intermediate progress.** Post a "ClawGuard is analyzing your PR..." comment immediately (before sandbox work starts) so the audience sees activity. Update the comment with phase progress.
4. **Have a recorded backup.** Record a successful run beforehand. If the live demo fails, switch to "let me show you what this looks like" with the recording.
5. **Set sandbox timeout appropriately.** Default is 5 minutes; Hobby max is 45 minutes. Set `timeout: 300000` (5 min) on `Sandbox.create()` for the analysis task.

**Warning signs:**
- Sandbox creation takes >5 seconds consistently
- `git clone` inside sandbox takes >10 seconds
- Demo rehearsal shows >30 second total latency from @mention to first visible response

**Phase to address:** Phase 1 (Infrastructure) for snapshot setup; Phase 4 (Demo prep) for warm-up scripts

---

### Pitfall 5: v0 SDK Generation Produces Inconsistent or Broken UI

**What goes wrong:**
The v0 SDK generates UI components from prompts, but output quality varies between invocations. The report page needs a security score gauge, OWASP chart, expandable finding cards, Mermaid diagrams, and code diffs -- all in a consistent dark theme. If you rely on v0 to generate these fresh each time or at build time, you risk: (a) inconsistent styling between components, (b) missing imports or broken component references, (c) components that do not properly consume your data props, (d) generation failures or timeouts that block the build.

**Why it happens:**
v0 is an AI code generator -- its output is non-deterministic. The SDK's `chats.init({ type: 'files' })` seeds from a template which helps consistency, but subsequent `chats.create()` calls for refinement can drift. Rate limits exist (check with `v0.rateLimits.find()`) but exact numbers are not documented publicly.

**How to avoid:**
1. **Generate once, commit the output, iterate manually.** Use v0 SDK to generate the initial report page components during development. Commit the generated code. Then hand-edit for consistency. Do NOT generate at runtime or per-request.
2. **Use the template baseline heavily.** The `chats.init({ type: 'files' })` approach with globals.css, shared components, and theme variables constrains v0's output. Provide a comprehensive template with your exact design tokens (colors, spacing, border-radius, font sizes).
3. **Generate one component at a time**, not the entire page. Generate the score gauge, then the findings cards, then the chart -- each seeded with the growing template. This gives you checkpoints.
4. **Have hand-coded fallbacks.** Build basic versions of each report component with plain shadcn/ui. Use v0 to "enhance" them. If v0 fails, the basic versions still work.
5. **Lock generated files.** The v0 SDK supports file locking to prevent AI from modifying certain files during subsequent generations.

**Warning signs:**
- Generated components reference non-existent imports
- Styling breaks when components are composed together
- Dark theme is inconsistently applied (some components use light backgrounds)
- v0 API calls return errors or take >30 seconds

**Phase to address:** Phase 2 (Report UI development) -- generate early, commit results, stop relying on API

---

### Pitfall 6: GitHub Webhook Duplicate Deliveries and Missing Signature Verification

**What goes wrong:**
Two failure modes: (1) If your webhook endpoint is slow (see Pitfall 1), GitHub retries the delivery, causing duplicate audit runs that waste API quota, confuse the PR thread with duplicate comments, and potentially create conflicting auto-fix commits. (2) If you skip webhook signature verification, anyone who discovers your webhook URL can trigger arbitrary audits, potentially running malicious code in your sandbox or exhausting your AI API credits.

**Why it happens:**
GitHub retries webhooks that do not receive a 2xx within 10 seconds. Signature verification requires computing HMAC-SHA256 over the raw request body and comparing with `X-Hub-Signature-256` using constant-time comparison. In Next.js App Router, the request body can only be read once, and many middleware patterns consume it before your handler sees it.

**How to avoid:**
1. **Respond 200 immediately** (see Pitfall 1). This eliminates retry-caused duplicates.
2. **Implement idempotency via delivery ID.** Store `X-GitHub-Delivery` header in Redis with a short TTL (5 min). Before processing, check if this delivery ID was already seen. Skip if duplicate.
3. **Verify signatures correctly in Next.js App Router:**
   ```typescript
   const body = await request.text(); // Read raw body ONCE
   const signature = request.headers.get('x-hub-signature-256');
   const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
   const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
   // THEN parse: const payload = JSON.parse(body);
   ```
4. **Never use `request.json()` before signature verification** -- it consumes the body and you lose the raw bytes needed for HMAC.
5. Filter events server-side: only process `issue_comment` events where the comment body contains your bot's @mention. Ignore all other event types early.

**Warning signs:**
- Multiple identical comments posted by the bot on the same PR
- Redis shows multiple audit entries for the same PR within seconds
- Webhook secret is stored in code rather than environment variables
- Signature verification is commented out "for testing"

**Phase to address:** Phase 1 (Webhook handler)

---

### Pitfall 7: Redis Data Size Explosion From Large Audit Results

**What goes wrong:**
A single audit result for a large PR can contain: findings array (10-30 items with code snippets), Mermaid diagram source strings, before/after code diffs, OWASP mappings, compliance tables, conversation history, and multiple phase results. This easily reaches 500KB-2MB per audit. Upstash Redis free tier has a 256MB data limit and 100MB max record size. Multiple audits on active repos can exhaust storage quickly. Additionally, storing large JSON values increases Redis read latency, and serialization/deserialization of complex objects becomes a bottleneck.

**Why it happens:**
Developers serialize the entire audit result as a single JSON blob keyed by `{owner}/{repo}/pr/{number}`. Code snippets and diffs are verbose. Conversation history grows with each follow-up message. No TTL is set so old audits accumulate forever.

**How to avoid:**
1. **Split storage by concern.** Use separate keys: `audit:{owner}/{repo}/{pr}:meta` (scores, grade, timestamp -- small), `audit:{owner}/{repo}/{pr}:findings` (findings array), `audit:{owner}/{repo}/{pr}:report` (full report data). This avoids reading the full blob for summary card generation.
2. **Set TTLs aggressively.** For a hackathon demo, 24-hour TTL is plenty. Set `EX 86400` on all keys. For production, 7-30 days with explicit archival.
3. **Truncate code snippets.** Limit code context to 20 lines around the vulnerability. Do not store entire files.
4. **Compress large values.** Use `zlib.gzip`/`zlib.gunzip` on the report JSON before storing. Reduces size by 60-80% for JSON text.
5. **Limit conversation history.** Keep only the last 10 messages per PR thread. Older messages can be summarized or dropped.
6. **Monitor with Upstash dashboard.** Check data size after each test audit run. If approaching 200MB on free tier, prune old data.

**Warning signs:**
- Redis GET calls taking >100ms
- `EXECABORT` or memory errors from Upstash
- Report page load times >3 seconds
- Free tier 256MB limit approaching after just a few test audits

**Phase to address:** Phase 2 (State management design) -- establish key schema before writing any pipeline code

---

### Pitfall 8: Mermaid Diagrams Fail to Render or Look Terrible

**What goes wrong:**
The agent generates Mermaid diagram source code (data flow diagrams, attack path diagrams) as part of its structured output. Common failures: (a) LLM produces syntactically invalid Mermaid markup, (b) diagrams are too complex (>20 nodes) causing the layout engine to produce overlapping labels or tiny unreadable text, (c) Mermaid's default styling clashes with the dark theme, (d) special characters in node labels (parentheses, brackets, quotes) break the parser, (e) client-side rendering fails silently leaving a blank div.

**Why it happens:**
Mermaid syntax is finicky -- unescaped characters, missing semicolons, or incorrect arrow syntax cause parse failures. LLMs are not reliable Mermaid authors. The layout algorithm (dagre) struggles with dense graphs. Dark theme requires explicit theme configuration.

**How to avoid:**
1. **Validate Mermaid syntax server-side** before storing in Redis. Use `mermaid.parse(diagramCode)` (Mermaid's built-in parser) to check syntax. If invalid, either ask the LLM to retry (one retry max) or fall back to a simple text-based representation.
2. **Constrain diagram complexity in the prompt.** Tell the agent: "Generate Mermaid diagrams with a maximum of 10 nodes and 15 edges. Use simple labels without special characters."
3. **Sanitize node labels.** Strip or escape parentheses, brackets, quotes, and angle brackets from all node labels before rendering. Replace with safe alternatives.
4. **Configure Mermaid for dark theme explicitly:**
   ```javascript
   mermaid.initialize({
     theme: 'dark',
     themeVariables: { primaryColor: '#1e1e2e', lineColor: '#cdd6f4' }
   });
   ```
5. **Pre-generate 2-3 diagram templates** for common patterns (data flow, attack path) and have the LLM fill in node/edge data rather than writing Mermaid from scratch.
6. **Render with error boundary.** Wrap Mermaid rendering in a React error boundary. On failure, show a styled "Diagram unavailable" placeholder rather than breaking the entire report page.

**Warning signs:**
- Blank spaces where diagrams should appear
- Console errors mentioning "Parse error" or "mermaid"
- Diagrams rendering with white backgrounds in dark-theme pages
- Node labels overlapping or text truncated to illegibility

**Phase to address:** Phase 2 (Report UI) -- validate early, have fallbacks ready

---

### Pitfall 9: Chat SDK GitHub Adapter Mismatch With Next.js Route Handlers

**What goes wrong:**
The Vercel Chat SDK is designed as a unified bot framework with platform adapters (GitHub, Slack, Discord). The code review guide example uses Hono as the server framework. Adapting this to Next.js App Router Route Handlers may cause issues: (a) the adapter expects specific request/response patterns that differ from Next.js `NextRequest`/`NextResponse`, (b) streaming responses via the Chat SDK may conflict with how Next.js handles response flushing, (c) JSX card rendering (for PR summary cards) may need a different setup in the Next.js context, (d) the adapter's event routing may not map cleanly to a single `POST` route handler.

**Why it happens:**
The Chat SDK is relatively new and the GitHub adapter examples target Hono specifically. Next.js App Router has its own patterns for streaming (using `ReadableStream`, `TransformStream`) that differ from Hono's streaming API. Developers assume adapter code is framework-agnostic when it may have Hono-specific assumptions.

**How to avoid:**
1. **Test the adapter integration first, before building the pipeline.** Get a minimal bot running that receives a webhook, posts "Hello" to a PR comment, and confirms the full round-trip works. Do this before writing any AI analysis code.
2. **If the adapter fights Next.js, skip it.** Build the GitHub integration directly with Octokit + raw webhook handling. The Chat SDK adapter is a convenience, not a requirement. For a hackathon, 50 lines of direct Octokit code may be faster than debugging adapter incompatibilities.
3. **Separate concerns in routes:**
   - `POST /api/webhook/github` -- raw webhook handler (signature verify, event dispatch)
   - `POST /api/audit/[pr]` -- internal API that runs the analysis pipeline
   - The webhook handler calls the audit API internally or via `waitUntil`
4. **For JSX cards, render to markdown.** GitHub PR comments accept markdown, not HTML/JSX. Convert your card design to a markdown template with emoji badges and tables. This is more reliable than trying to get JSX rendering through the Chat SDK's GitHub card system.

**Warning signs:**
- Adapter initialization throws errors about missing Hono context
- Webhook events are received but responses are never posted to GitHub
- Streaming responses produce garbled or incomplete PR comments
- You spend >2 hours trying to make the adapter work with Next.js

**Phase to address:** Phase 1 (Infrastructure) -- validate or abandon adapter in first 2 hours

---

### Pitfall 10: Live Demo Catastrophic Failure Modes

**What goes wrong:**
During the 3-minute live demo, multiple failure points compound: (a) hackathon WiFi is unreliable, causing webhook delivery failures, (b) AI API rate limits hit if multiple teams are using Vercel AI Gateway simultaneously, (c) the demo repo's planted vulnerabilities trigger different findings than expected because the model is non-deterministic, (d) the Vercel deployment goes cold and the first request has a 5-10 second cold start, (e) GitHub's API has a momentary outage, (f) the Redis instance is in a different region causing extra latency.

**Why it happens:**
Live demos chain multiple external services (GitHub, Vercel Functions, Vercel Sandbox, AI model API, Upstash Redis, v0 SDK). Each has independent failure modes. The probability of ALL services working perfectly in a 3-minute window is lower than developers expect.

**How to avoid:**
1. **Pre-compute the "happy path."** Before the demo, run the full audit against the demo repo. Store the results in Redis. The report page works immediately from cached data. The live demo shows the trigger; the report is already there.
2. **Implement graceful degradation at every step:**
   - Webhook fails? Show the manual trigger button on the dashboard
   - Sandbox fails? Show cached results from a previous run
   - Mermaid fails? Show text fallback
   - AI API slow? Show streaming progress indicator
3. **Demo against your own fork**, not a public repo. You control the content and there are no surprise changes.
4. **Use a mobile hotspot** as backup network, not just hackathon WiFi.
5. **Practice the demo 5+ times** with the actual deployment, not localhost. Identify and fix each failure point.
6. **Set up the demo repo correctly:**
   - 3 PRs with planted vulnerabilities of varying severity
   - Known expected findings for each PR (validate during rehearsal)
   - Small PRs (< 200 lines diff) to keep analysis fast

**Warning signs:**
- Rehearsal takes >3 minutes for the full flow
- Different findings appear on different runs of the same PR
- Any step requires >30 seconds of waiting with no visible progress
- The demo requires specific timing (e.g., "wait for this to finish before clicking that")

**Phase to address:** Phase 4 (Demo preparation) -- dedicated phase for demo hardening

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single Redis key per audit (giant JSON blob) | Simple read/write | Slow reads, hard to query subsets, wastes bandwidth | Never -- split keys from day 1, it takes 5 minutes |
| Hardcoded model name instead of config | Faster initial dev | Cannot switch models when one is slow/degraded | Hackathon only -- add config.yml reader by Phase 3 |
| No retry logic on AI SDK calls | Simpler code | Single transient failure kills entire audit | Hackathon MVP only -- add 1 retry with backoff by demo day |
| Storing full file contents in findings | Rich context | Massive payloads, Redis bloat, slow page loads | Never -- always truncate to 20-line context windows |
| Skipping Mermaid syntax validation | Faster pipeline | Broken diagrams in report (bad demo look) | Never -- add parse check, it is 3 lines of code |
| Using `request.json()` before signature verify | Cleaner code | Security vulnerability, signature cannot be verified | Never -- always read raw body first |
| Committing v0-generated code without review | Fast UI development | Inconsistent styles, broken imports, accessibility issues | Acceptable if you review and fix within 30 minutes |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub Webhooks | Consuming request body with `request.json()` before HMAC verification | Read body with `request.text()` first, verify HMAC, then `JSON.parse()` |
| GitHub Webhooks | Not filtering event types -- processing every webhook delivery | Check `X-GitHub-Event` header and `action` field; only process `issue_comment.created` with @mention |
| GitHub API (Octokit) | Creating commits with stale parent SHA | Fetch branch HEAD SHA immediately before commit creation; handle 409 with retry |
| GitHub API (Octokit) | Exceeding secondary rate limits (80 content-creating requests/min) | Batch comment updates; edit existing comments instead of posting new ones; add 1s delay between write operations |
| Vercel Sandbox | Not setting explicit timeout on `Sandbox.create()` | Always pass `timeout` option; default 5min may be too short for complex analysis or too long for wasted resources |
| Vercel Sandbox | Assuming packages are pre-installed | Sandbox has minimal packages (git, node, python). Install additional tools via `sandbox.commands.run('sudo dnf install ...')` or use snapshots |
| Upstash Redis | Not setting TTL on keys | Always use `EX` parameter. Data accumulates silently; 256MB free limit hits unexpectedly |
| Upstash Redis | Storing/reading large values synchronously in the request path | Move large reads to parallel promises; compress values >100KB; use split keys so summary views do not load full report data |
| AI SDK (generateText) | Not handling `AI_NoObjectGeneratedError` | Wrap structured output calls in try/catch; inspect `error.text` for manual JSON extraction; implement one-retry fallback |
| AI SDK (tools) | Not setting `stopWhen` on agent loops | Always use `stopWhen: stepCountIs(N)` to prevent infinite tool-calling loops that exhaust tokens and time |
| v0 SDK | Calling v0 generation at runtime / per-request | Generate during development, commit output, iterate manually. Never generate UI dynamically per-audit |
| Mermaid | Trusting LLM-generated Mermaid syntax without validation | Always run `mermaid.parse()` before rendering; catch errors and show fallback |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Serializing full audit JSON on every report page load | Report page takes 3-5s to load | Split Redis keys by concern; load summary first, findings on demand | Audit results >500KB |
| Running all 3 analysis phases sequentially in one function | Total analysis time >3 minutes; function timeout risk | Use `waitUntil` for background processing; stream phase completion updates to PR | Any PR with >100 lines of diff |
| Cloning full repo in sandbox for every audit | 10-30s clone time for large repos | Use shallow clone (`--depth 1`); better yet, only fetch the PR diff via GitHub API and write relevant files to sandbox | Repos >100MB |
| Re-rendering Mermaid diagrams on every page visit (client-side) | Page jank, layout shifts, slow interactivity | Render Mermaid to SVG server-side or on first load, cache the SVG string in Redis alongside the diagram source | Pages with >3 diagrams |
| Loading all findings at once in the report page | DOM bloat, slow initial render for large finding sets | Virtualize or paginate findings list; load first 5, lazy-load rest | Audits with >15 findings |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Webhook secret in source code or `.env.local` committed to repo | Anyone can forge webhook payloads, trigger arbitrary audits, exhaust API credits | Store in Vercel environment variables (encrypted); never commit; use separate secrets for dev/prod |
| Executing arbitrary code from PR diffs in sandbox without scoping | Malicious PR could exploit sandbox to attack external services | Sandbox is isolated by design (Firecracker VM), but still: do not `eval()` PR code; only use readFile/writeFile/bash tools with explicit file paths; sandbox has network access so consider restricting outbound calls for untrusted repos |
| Bot has write access to all repos but no scope limitation | Compromised bot token could push malicious code to any connected repo | Request minimum GitHub App permissions: `pull_requests: write`, `contents: write` only on repos that explicitly install the app; never use a personal access token |
| No rate limiting on audit triggers | Attacker spams @mentions to exhaust AI API credits | Implement per-repo and per-user cooldowns in Redis (e.g., max 5 audits per PR per hour); ignore bot-authored comments to prevent loops |
| Posting raw LLM output to PR comments without sanitization | LLM could produce markdown injection, misleading links, or prompt leakage | Sanitize all LLM-generated content before posting; strip raw URLs; escape markdown formatting in code blocks |
| Auto-fix commits made with bot identity bypass branch protections | Fixes could skip required reviews, CI checks | Ensure the GitHub App does not have "bypass branch protection" permission; fixes should be subject to the same PR rules |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visible progress for 30+ seconds after @mention | User thinks bot is broken; may @mention again (causing duplicates) | Post "Analyzing your PR..." comment within 3 seconds; update with phase progress |
| Posting one giant comment with all findings | Wall of text; user stops reading after first screen | Post a concise summary card (score, top 3 findings, report link); full details on the web report page |
| Overloading the report page with all data at once | Slow load, overwhelming information | Progressive disclosure: score and grade visible first, expandable sections for details, findings sorted by severity |
| Mermaid diagrams take up half the page | Diagrams push actual findings below the fold | Diagrams should be collapsible/togglable; show them in dedicated tabs or expand-on-click sections |
| Auto-fix changes code without clear explanation | Developer does not trust or understand the fix | Always post a "Proposed Fix" comment with the diff and explanation BEFORE committing; let the developer review |
| Security score feels arbitrary | Developer does not know why they got a C+ vs B- | Show score breakdown: base 100, deductions listed per finding with severity weight; transparent formula |

## "Looks Done But Isn't" Checklist

- [ ] **Webhook handler:** Often missing duplicate delivery detection -- verify `X-GitHub-Delivery` idempotency check exists
- [ ] **Webhook handler:** Often missing signature verification -- verify HMAC-SHA256 check runs on raw body before any processing
- [ ] **Webhook handler:** Often missing event type filtering -- verify only `issue_comment` events with `@clawguard` in body are processed
- [ ] **Agent pipeline:** Often missing `stopWhen` bound -- verify all `generateText` calls with tools have a step limit
- [ ] **Agent pipeline:** Often missing error handling for `AI_NoObjectGeneratedError` -- verify try/catch with fallback exists
- [ ] **Auto-fix flow:** Often missing pre-commit validation -- verify syntax check runs in sandbox before GitHub commit
- [ ] **Auto-fix flow:** Often missing stale SHA detection -- verify branch HEAD is fetched immediately before commit creation
- [ ] **Report page:** Often missing loading states -- verify skeleton/spinner shows while Redis data loads
- [ ] **Report page:** Often missing Mermaid error boundary -- verify broken diagrams show fallback, not blank space
- [ ] **Report page:** Often missing dark theme on Mermaid diagrams -- verify `mermaid.initialize({ theme: 'dark' })` is set
- [ ] **Redis storage:** Often missing TTL on keys -- verify all `SET` calls include `EX` parameter
- [ ] **Redis storage:** Often missing key size awareness -- verify no single value exceeds 1MB
- [ ] **Demo repo:** Often missing deterministic findings -- verify the same audit produces the same critical findings across 3+ runs
- [ ] **Dashboard OAuth:** Often missing error handling for token refresh -- verify expired GitHub tokens trigger re-auth gracefully

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Function timeout kills audit mid-run | LOW | Agent should checkpoint phase results to Redis as they complete. Recovery: re-run only remaining phases. For demo: show cached results from previous successful run |
| Structured output parse failure | LOW | Catch error, inspect raw text, attempt manual JSON extraction. If still fails: post "partial results available" with whatever was parsed. For demo: fall back to cached results |
| Auto-fix breaks the build | MEDIUM | Post a comment explaining the fix attempt failed validation. Do NOT commit broken code. For demo: show the "proposed fix" diff in the PR comment without committing |
| Sandbox failure / cold start timeout | LOW | Retry once with a fresh sandbox instance. If still fails: fall back to "analysis without sandbox" mode -- use only the diff from GitHub API (less thorough but works) |
| Redis data corruption or size limit | MEDIUM | Flush audit keys for the affected PR (`DEL audit:owner/repo/pr:*`). Re-run the audit. For demo: pre-populate Redis with known-good results during setup |
| v0 SDK generation produces broken component | LOW | Already committed working baseline components. Revert the v0-generated file to the baseline. Hand-fix during the next dev cycle |
| Duplicate webhook processing | LOW | Idempotent by design (same key in Redis). Second run overwrites first with identical results. Only problematic if both post comments -- deduplicate by checking for existing bot comment before posting |
| Demo WiFi failure | HIGH | Switch to mobile hotspot immediately. If no connectivity: use pre-recorded demo video. Always have the video ready on local storage (not cloud) |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| P1: Function timeout vs webhook | Phase 1: Infrastructure | Webhook returns 200 in <1s; audit completes via waitUntil; test with `maxDuration` set |
| P2: Structured output failures | Phase 2: Agent pipeline | Run agent against 3 different PRs; all produce valid JSON matching Zod schema |
| P3: Auto-fix commit failures | Phase 3: Auto-fix loop | Fix generates, validates in sandbox, commits successfully; branch HEAD check prevents 409 |
| P4: Sandbox cold start latency | Phase 1: Infrastructure + Phase 4: Demo prep | Snapshot created and tested; pre-warm script exists; cold-start <5s in rehearsal |
| P5: v0 SDK inconsistency | Phase 2: Report UI | All components generated, committed, and hand-verified; no runtime v0 calls |
| P6: Webhook security and duplicates | Phase 1: Infrastructure | Signature verification passes/fails correctly; duplicate deliveries are idempotent |
| P7: Redis data size explosion | Phase 2: State management | Key schema documented; split keys in use; TTLs set; single audit <200KB |
| P8: Mermaid rendering failures | Phase 2: Report UI | Diagrams validate with mermaid.parse(); error boundary tested; dark theme confirmed |
| P9: Chat SDK adapter mismatch | Phase 1: Infrastructure | Adapter works with Next.js OR direct Octokit approach validated; decision made in first 2 hours |
| P10: Live demo failures | Phase 4: Demo prep | 5 rehearsal runs completed; backup video recorded; pre-computed results in Redis; hotspot ready |

## Sources

- Vercel Functions Duration Limits: https://vercel.com/docs/functions/configuring-functions/duration (Verified 2026-03-27 -- Hobby 300s max, Pro/Enterprise 800s max with Fluid Compute)
- Vercel Fluid Compute: https://vercel.com/docs/fluid-compute (Verified 2026-03-27 -- enabled by default since April 2025, waitUntil supported)
- Vercel Sandbox Documentation: https://vercel.com/docs/vercel-sandbox (Verified 2026-03-27 -- Firecracker microVMs, millisecond startup, iad1 region only)
- Vercel Sandbox Pricing and Limits: https://vercel.com/docs/vercel-sandbox/pricing (Verified 2026-03-27 -- Hobby max 45 min, 4 vCPU, 8GB RAM, 10 concurrent)
- AI SDK Structured Data Generation: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data (Verified 2026-03-27 -- AI_NoObjectGeneratedError, Output.object, Zod schemas, .describe())
- AI SDK Agents and Tools: https://ai-sdk.dev/docs/ai-sdk-core/agents (Verified 2026-03-27 -- stopWhen, stepCountIs, onStepFinish)
- AI SDK Tool Calling: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling (Verified 2026-03-27 -- tool definitions, maxSteps via stopWhen)
- GitHub Webhook Signature Validation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries (Verified 2026-03-27 -- HMAC-SHA256, timingSafeEqual, X-Hub-Signature-256)
- GitHub REST API Rate Limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api (Verified 2026-03-27 -- 5000 req/hr for apps, 80 content-creating/min secondary limit)
- GitHub Git Commits API: https://docs.github.com/en/rest/git/commits (Verified 2026-03-27 -- tree/blob/commit creation flow, 409/422 error handling)
- Upstash Redis Pricing: https://upstash.com/docs/redis/overall/pricing (Verified 2026-03-27 -- 256MB free tier, 100MB max record, 10K req/sec)
- Mermaid.js Getting Started: https://mermaid.js.org/intro/getting-started.html (Verified 2026-03-27 -- initialization, parse validation, theme config)
- Vercel Chat SDK: https://chat-sdk.dev (Verified 2026-03-27 -- unified bot SDK, GitHub adapter, JSX cards, streaming)
- v0 SDK Documentation: https://v0.app/docs/ (Verified 2026-03-27 -- chats.init, chats.create, file locking, rate limit endpoint)

---
*Pitfalls research for: ClawGuard -- AI-powered GitHub PR security review agent*
*Researched: 2026-03-27*
