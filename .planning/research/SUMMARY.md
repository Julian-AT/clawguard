# Project Research Summary

**Project:** ClawGuard -- AI-Powered GitHub PR Security Review Agent
**Domain:** AI-powered code security analysis with agentic remediation
**Researched:** 2026-03-27
**Confidence:** MEDIUM-HIGH

## Executive Summary

ClawGuard is an AI-powered GitHub PR security agent that runs a 3-phase audit (code quality, vulnerability scan, threat model), posts findings to the PR thread, generates interactive per-PR security reports, and autonomously fixes vulnerabilities by committing patches back to the branch. The recommended build uses a single Next.js 16 App Router deployment on Vercel, with the Vercel AI SDK ToolLoopAgent driving analysis inside Vercel Sandbox microVMs, the Chat SDK with GitHub adapter handling PR interactions, and Upstash Redis storing audit results. This is a well-understood pattern for webhook-driven AI agents, with one critical exception: the Chat SDK's GitHub adapter has only been demonstrated with Hono, not Next.js, making that integration the single highest-risk technical decision in the project.

The strongest competitive differentiators are the full agentic auto-fix loop (detect, fix in sandbox, validate, commit, re-audit -- no competitor completes this cycle) and the interactive per-PR web report (no competitor generates a standalone, shareable security report page per pull request). Threat modeling as a PR review phase and compliance framework mapping at the finding level are also entirely novel in this space. These four capabilities, combined with a polished dark-theme UI, target three hackathon judging angles simultaneously: agent autonomy, cybersecurity depth, and product-readiness.

The primary risks are: (1) the Chat SDK GitHub adapter may not integrate cleanly with Next.js Route Handlers -- validate this in the first 2 hours or fall back to direct Octokit; (2) ToolLoopAgent structured output can fail schema validation on complex Zod schemas -- keep schemas flat, handle `AI_NoObjectGeneratedError` with fallback parsing; (3) Vercel Sandbox runs only in iad1 (US East), adding 100-150ms transatlantic latency from Vienna -- use sandbox snapshots and pre-warming to compensate; (4) the live demo chains 5+ external services, so demo hardening (pre-computed results, backup video, mobile hotspot) must be a dedicated phase, not an afterthought.

## Key Findings

### Recommended Stack

The stack centers on Next.js 16.2.1 (App Router) as the single deployment surface, with React 19.2.4. AI analysis uses `ai@6.0.141` (Vercel AI SDK) with `@ai-sdk/gateway@3.0.83` for model routing through Vercel AI Gateway. The Chat SDK (`chat@4.23.0` + `@chat-adapter/github@4.23.0`) handles webhook parsing, thread management, and PR comment posting. Code analysis runs in `@vercel/sandbox@1.9.0` Firecracker microVMs. Zod 4.3.6 is mandatory -- the AI SDK peer-requires `^3.25.76 || ^4.1.8`, and Zod 4 is the current recommended version.

**Core technologies:**
- **Next.js 16 (App Router)**: Single deployment for webhooks, API routes, report pages, dashboard -- simplicity is critical for a hackathon
- **AI SDK ToolLoopAgent**: Agent orchestration with sandbox tools (readFile, bash, writeFile); `stopWhen: stepCountIs(N)` bounds iterations
- **Chat SDK + GitHub adapter**: Webhook signature verification, @mention detection, JSX card rendering as GFM Markdown, thread subscription
- **Vercel Sandbox**: Firecracker microVMs for isolated repo analysis and fix generation; git clone built into `source` parameter
- **Upstash Redis**: Dual-protocol (HTTP REST for audit storage, TCP for Chat SDK state); serverless-native
- **Zod 4**: Schema validation for structured AI output, Redis data integrity, and report page props
- **shadcn/ui + Tailwind CSS v4**: Dark-theme UI components; Tailwind v4 uses CSS-based config (major rewrite from v3)

**Critical compatibility notes:**
- Redis requires TWO connection strategies: `@upstash/redis` (HTTP) for audit data, `redis@5` (TCP) for Chat SDK state adapter
- Mermaid is browser-only; must use `'use client'` + `dynamic(() => import(...), { ssr: false })`
- Tailwind v4 replaces `tailwind.config.js` with CSS-based `@import "tailwindcss"` -- most tutorials reference v3 patterns
- v0 SDK requires a paid Premium or Team plan and `V0_API_KEY`

### Expected Features

**Must have (table stakes -- judges compare against CodeRabbit, Snyk, Semgrep):**
- PR comment with findings summary, severity badges, and score
- Vulnerability detection with Critical/High/Medium/Low classification
- CWE and OWASP Top 10 categorization on every finding
- Code snippets with file path and line references
- Remediation guidance per finding
- GitHub App integration via PR webhook events
- Per-repo configuration (`.clawguard/config.yml`)

**Should have (differentiators -- these win the hackathon):**
- Agentic auto-fix loop: detect, fix in sandbox, validate, commit to PR, re-audit with new score (strongest differentiator -- no competitor completes this cycle)
- Interactive per-PR web report with score gauge, OWASP charts, Mermaid diagrams, expandable cards (genuinely novel -- no competitor offers this)
- Security score (0-100 numeric + A-F grade) with transparent deduction formula
- Threat modeling as a review phase with attack path diagrams (entirely novel in PR review space)
- Compliance framework mapping (PCI DSS, SOC 2, HIPAA, NIST) at the individual finding level
- Follow-up conversational chat in PR thread (security-focused, not generic code review)
- Natural language custom policies via `.clawguard/policies.yml`

**Defer (v2+ / mock if time permits):**
- Dashboard with GitHub OAuth (show static mockup if needed)
- Score trend charts over time (requires multiple audits)
- v0 SDK runtime report generation (use for dev-time generation only, commit output)
- IDE integration, multi-platform support, custom rule DSL, dependency scanning, secret scanning

### Architecture Approach

The architecture is a single Next.js deployment with three surface areas: webhook API routes (receive GitHub events, dispatch to Chat SDK), public report pages (SSR from Redis data), and authenticated dashboard pages (behind NextAuth.js). The webhook handler uses Next.js `after()` to return 200 immediately and run the analysis pipeline in the background (up to 300s default, 800s on Pro). Each audit creates a fresh Sandbox microVM, runs a 3-phase ToolLoopAgent analysis, stores results in Redis, and posts a summary Card to the PR thread. Auto-fix extends this by generating patches in the sandbox, validating them, committing via Octokit, then re-running the full pipeline.

**Major components and build order:**
1. **Redis + Zod schemas** -- Data contracts first; every other component reads/writes structured data
2. **Sandbox + AI SDK tools** -- Isolated execution environment; testable independently with a mock repo
3. **Chat SDK bot + 3-phase pipeline + webhook route** -- Core product loop: @mention triggers audit, posts card
4. **Auto-fix loop** -- Extends pipeline; requires working audit before fix logic layers on
5. **Report pages + Dashboard** -- Read-only consumers of Redis data; can be built in parallel with phases 3-4

**Key patterns:**
- `after()` for background processing (never block the webhook response)
- Sandbox-per-audit isolation (never reuse sandboxes across PRs)
- Bot-as-module singleton (idempotent handler registration)
- Split Redis keys by concern (meta, findings, report -- never one giant JSON blob)

### Critical Pitfalls

1. **Chat SDK + Next.js adapter mismatch** -- The GitHub adapter examples target Hono, not Next.js. Test the round-trip (webhook receive, post PR comment) in the first 2 hours. If it fights Next.js, fall back to direct Octokit + raw webhook handling (50 lines of code). Do not spend more than 2 hours on adapter debugging.

2. **Webhook timeout causing duplicate processing** -- GitHub expects 200 within 10 seconds; analysis takes 30-120s. Return 200 immediately via `after()`. Implement idempotency via `X-GitHub-Delivery` header stored in Redis with 5-min TTL. Never call `request.json()` before signature verification.

3. **ToolLoopAgent structured output failures** -- Complex nested Zod schemas cause `AI_NoObjectGeneratedError`. Keep schemas flat. Catch the error, inspect `error.text`, attempt manual JSON extraction. Always set `stopWhen: stepCountIs(15-20)` to prevent infinite loops. Pre-test schemas against 3+ different PR diffs.

4. **Auto-fix commits that break the PR** -- Validate fixes in sandbox (syntax check, lint) before committing. Fetch latest branch HEAD SHA immediately before commit creation. Scope fixes conservatively for the demo (SQL injection parameterization, XSS escaping). Post the diff as a comment before committing.

5. **Live demo catastrophic failure** -- Five external services must work simultaneously. Pre-compute happy-path results in Redis before the demo. Have a recorded backup video on local storage. Use mobile hotspot as backup network. Practice 5+ times against the actual deployment. Show intermediate progress ("Analyzing your PR...") within 3 seconds of @mention.

## Implications for Roadmap

Based on combined research, the following phase structure respects component dependencies, front-loads risk validation, and ensures the demo-critical path is solid before adding polish.

### Phase 1: Foundation and Integration Validation
**Rationale:** The Chat SDK + Next.js integration is the highest-risk unknown. Validate it immediately or pivot to direct Octokit. Redis schemas and sandbox connectivity are prerequisites for everything else.
**Delivers:** Working webhook that receives @mention, posts "Hello" to PR thread, creates a sandbox, reads a file, stores result in Redis. The entire infrastructure chain proven end-to-end.
**Addresses:** GitHub webhook handler, Chat SDK integration (or fallback decision), Redis key schema, sandbox connectivity
**Avoids:** Pitfall 9 (Chat SDK adapter mismatch), Pitfall 1 (webhook timeout), Pitfall 6 (webhook security/duplicates)
**Stack elements:** Next.js, Chat SDK + GitHub adapter (or Octokit fallback), @vercel/sandbox, @upstash/redis, Zod schemas

### Phase 2: AI Analysis Pipeline
**Rationale:** The 3-phase security pipeline is the core product. It depends on Phase 1 infrastructure (sandbox, Redis, webhook) and is a prerequisite for auto-fix, reports, and the summary card.
**Delivers:** Complete 3-phase audit (code quality, vulnerability scan, threat model) producing structured JSON with findings, severity levels, CWE/OWASP mappings, security score, and Mermaid diagram source. Summary Card posted to PR thread.
**Addresses:** 3-phase security pipeline, structured JSON output, security scoring, CWE/OWASP categorization, PR summary card
**Avoids:** Pitfall 2 (structured output failures), Pitfall 7 (Redis data size explosion), Pitfall 8 (Mermaid syntax validation)
**Stack elements:** AI SDK ToolLoopAgent, Zod 4 schemas, Vercel AI Gateway, system prompts per phase

### Phase 3: Auto-Fix Loop
**Rationale:** The agentic auto-fix loop is the strongest differentiator. It depends on a working audit pipeline (Phase 2) to know what to fix. The re-audit step reuses the Phase 2 pipeline.
**Delivers:** Agent generates fix in sandbox, validates it, commits to PR branch via Octokit, re-runs full audit, posts updated Card with new score. The complete find-fix-validate-commit-re-audit cycle.
**Addresses:** Auto-fix generation and validation, commit to PR branch, re-audit with updated score, action buttons in summary card
**Avoids:** Pitfall 3 (broken auto-fix commits), Pitfall 4 (sandbox reliability)
**Stack elements:** Vercel Sandbox (fix generation + validation), @octokit/rest (commit creation), AI SDK ToolLoopAgent (fix agent)

### Phase 4: Interactive Report and UI
**Rationale:** The web report is the visual wow factor for the cybersecurity judge. It is a read-only consumer of Redis data from Phase 2, so it can be built once audit JSON exists. Use v0 SDK at dev-time to generate initial components, then commit and hand-edit. Never call v0 at runtime.
**Delivers:** Interactive report page at `/report/[owner]/[repo]/[pr]` with security gauge, OWASP chart, expandable finding cards, code diffs with syntax highlighting, Mermaid diagrams, compliance mapping table. Dark theme, professional density.
**Addresses:** Interactive web report, security score gauge, OWASP distribution chart, Mermaid diagrams, before/after code diffs, compliance mapping
**Avoids:** Pitfall 5 (v0 SDK inconsistency -- generate once, commit output), Pitfall 8 (Mermaid rendering -- error boundaries, dark theme config)
**Stack elements:** shadcn/ui, Tailwind CSS v4, Recharts, Mermaid (client-only with dynamic import), shiki, react-diff-viewer-continued, v0-sdk (dev-time only)

### Phase 5: Extended Capabilities
**Rationale:** Follow-up chat, config/policies, and dashboard are "real product" signals but not demo-critical. Build only if the core loop (Phases 1-4) is solid.
**Delivers:** Conversational follow-up in PR threads, `.clawguard/config.yml` + `policies.yml` support, dashboard with GitHub OAuth login and audit history.
**Addresses:** Follow-up chat, per-repo config, custom policies, dashboard with OAuth
**Avoids:** Over-scoping before the core demo works
**Stack elements:** Chat SDK thread subscriptions, yaml parser, NextAuth.js, dashboard components

### Phase 6: Demo Hardening
**Rationale:** Demo hardening is NOT optional polish -- it is a dedicated phase. Research identifies 10 distinct failure modes in live demos. The hackathon is won or lost in 3 minutes of presentation.
**Delivers:** Demo repo with 3 PRs and planted vulnerabilities validated across 5+ runs. Pre-computed results cached in Redis. Sandbox snapshots for fast cold starts. Pre-warm script. Recorded backup video. Mobile hotspot tested. Graceful degradation at every step.
**Addresses:** Demo reliability, fallback strategies, pre-computed results, rehearsal validation
**Avoids:** Pitfall 10 (live demo catastrophic failure), Pitfall 4 (sandbox cold start during demo)

### Phase Ordering Rationale

- **Risk-first:** Phase 1 validates the highest-risk integration (Chat SDK + Next.js) before any significant code is written. If the adapter fails, the fallback to direct Octokit is cheap at this stage, expensive later.
- **Dependency-driven:** Each phase produces outputs consumed by the next. Schemas (P1) feed the pipeline (P2), pipeline findings feed auto-fix (P3), audit JSON feeds the report (P4).
- **Demo-critical path prioritized:** Phases 1-4 constitute the minimum demo: @mention triggers audit, posts card, shows report, fixes vulnerabilities. Phase 5 adds depth. Phase 6 ensures reliability.
- **Parallel opportunities:** Phase 4 (report UI) can be started as soon as Phase 2 produces sample audit JSON in Redis, even before Phase 3 is complete. A designer/frontend developer could work on P4 while the agent developer finishes P3.
- **Demo hardening is a phase, not a task:** Every pitfall related to demo reliability compounds. Dedicating Phase 6 to demo prep ensures it gets real attention, not last-minute scrambling.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 1 (Foundation):** Chat SDK + Next.js integration is sparsely documented. The adapter examples use Hono. Needs hands-on spike to validate or determine fallback approach. Budget 2 hours for this validation alone.
- **Phase 2 (Pipeline):** ToolLoopAgent structured output with complex Zod 4 schemas needs empirical testing. The Zod 4 API has some differences from Zod 3 that may surface in edge cases. Test against real PR diffs early.
- **Phase 3 (Auto-Fix):** GitHub Git Data API for commit creation (blob/tree/commit/ref) is low-level and error-prone. Consider using the simpler Contents API for single-file fixes. Needs API reference review during planning.

**Phases with standard patterns (skip deep research):**
- **Phase 4 (Report UI):** shadcn/ui + Recharts + Tailwind v4 is well-documented. The main risk (Mermaid) is already mitigated by pitfall research. Standard React SSR patterns apply.
- **Phase 5 (Extended):** NextAuth.js GitHub OAuth, YAML parsing, and Chat SDK thread subscriptions are all well-documented with established patterns.
- **Phase 6 (Demo Hardening):** No technical research needed -- this is execution discipline. The pitfalls document already provides the complete checklist.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified via npm registry on 2026-03-27. Dependency trees checked for compatibility. Zod 4 + AI SDK peer requirement confirmed. |
| Features | MEDIUM-HIGH | Competitor analysis based on product pages and docs (fetched 2026-03-27). Feature landscape is well-understood for established tools (CodeRabbit, Snyk, Semgrep). ClawGuard differentiators are genuinely novel based on available evidence. |
| Architecture | MEDIUM-HIGH | Core patterns (webhook + after(), sandbox-per-audit, ToolLoopAgent) verified against official docs. The Chat SDK + Next.js integration pattern is the key uncertainty -- adapter examples only show Hono. Redis key schema is project-specific design, not externally validated. |
| Pitfalls | HIGH | All pitfalls verified against official documentation (Vercel, GitHub, AI SDK, Mermaid). Recovery strategies and phase mappings are concrete. The "looks done but isn't" checklist is directly actionable. |

**Overall confidence:** MEDIUM-HIGH

The stack, features, and pitfalls are well-researched with high-quality sources. The architecture is sound but carries one significant uncertainty: whether the Chat SDK GitHub adapter works smoothly with Next.js App Router. This must be validated empirically in Phase 1.

### Gaps to Address

- **Chat SDK + Next.js compatibility:** No documentation or examples confirm the GitHub adapter works with Next.js Route Handlers. The fallback (direct Octokit) is viable but changes the developer experience. Resolve in Phase 1 with a 2-hour time-boxed spike.
- **Vercel Sandbox latency from Vienna:** The sandbox runs only in iad1 (US East). Real-world latency from Vienna hackathon venue is estimated at 100-150ms per API call but not measured. Validate during Phase 1 setup; if unacceptable, pre-warm aggressively and accept the latency.
- **Zod 4 edge cases with AI SDK:** Zod 4 is relatively new. The AI SDK's `zodSchema()` helper handles version bridging, but complex schemas (nested arrays, discriminated unions) may surface compatibility issues. Test the exact audit result schema in Phase 2 before building consumers.
- **v0 SDK rate limits and reliability:** Rate limits for the v0 Platform API are not publicly documented. The recommendation to use v0 for dev-time generation only (not runtime) mitigates this, but initial component generation sessions may hit limits. Have hand-coded fallback components ready.
- **Dual Redis connection strategies:** The Chat SDK state adapter requires TCP (`redis@5`) while audit storage uses HTTP REST (`@upstash/redis`). Both work with Upstash, but managing two connection configurations adds operational complexity. Validate both connections work from Vercel in Phase 1.

## Sources

### Primary (HIGH confidence)
- npm registry -- all package versions verified 2026-03-27
- Vercel Sandbox SDK Reference: https://vercel.com/docs/vercel-sandbox/sdk-reference
- Vercel Functions Duration Limits: https://vercel.com/docs/functions/configuring-functions/duration
- Vercel Fluid Compute: https://vercel.com/docs/fluid-compute
- AI SDK Agents: https://ai-sdk.dev/docs/foundations/agents
- AI SDK Structured Data: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- AI SDK Tools: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- GitHub Webhook Signature Validation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub REST API Rate Limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Next.js after() API: https://nextjs.org/docs/app/api-reference/functions/after
- Tailwind CSS v4 Next.js Guide: https://tailwindcss.com/docs/installation/framework-guides/nextjs
- Mermaid.js: https://mermaid.js.org/intro/getting-started.html
- Chat SDK Documentation: https://chat-sdk.dev/docs
- Chat SDK GitHub Adapter: https://chat-sdk.dev/docs/adapters/github
- v0 SDK Documentation: https://v0.app/docs/
- Auth.js (NextAuth.js): https://authjs.dev/getting-started
- Upstash Redis: https://upstash.com/docs/redis/overall/getstarted

### Secondary (MEDIUM confidence)
- Chat SDK + Next.js integration pattern -- inferred from adapter API surface, not confirmed with working example
- Competitor product pages (CodeRabbit, Snyk, Semgrep, GHAS, SonarCloud, Aikido) -- feature claims verified from marketing pages, not hands-on testing
- OWASP ASVS project page -- compliance mapping approach validated against published ASVS requirements

### Tertiary (LOW confidence)
- Zod 4 API differences with complex AI SDK schemas -- relatively new release, edge cases may surface
- Vercel Sandbox latency from European locations -- not measured, estimated from general transatlantic latency
- v0 SDK rate limits -- not publicly documented, mitigated by dev-time-only usage recommendation

---
*Research completed: 2026-03-27*
*Ready for roadmap: yes*
