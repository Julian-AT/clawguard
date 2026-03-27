# Feature Research

**Domain:** AI-powered GitHub PR security review agents
**Researched:** 2026-03-27
**Confidence:** MEDIUM-HIGH (based on competitor product pages, docs, and established training data for well-known tools)

## Feature Landscape

### Table Stakes (Users Expect These)

Features that every AI PR security review tool ships. Missing any of these makes the product feel broken or toy-like. For a hackathon context, "users" means judges comparing against known tools.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| PR comment with findings summary | Every competitor (CodeRabbit, Snyk, Semgrep, GHAS) posts inline PR comments. Without this, you have no visible output. | MEDIUM | ClawGuard's JSX summary card with severity badges covers this. Must include finding count, severity breakdown, and actionable next steps. |
| Vulnerability detection with severity levels | Fundamental purpose of the tool. Critical/High/Medium/Low classification is universal (Snyk, SonarCloud, Semgrep all do this). | MEDIUM | ClawGuard uses AI-driven analysis rather than traditional SAST, which is fine -- but findings MUST have severity levels or judges will see it as unstructured. |
| CWE and/or OWASP categorization | Industry standard. Snyk maps to CWE, Semgrep maps to CWE/OWASP in rules, GHAS/CodeQL uses CWE. Without this, findings look amateur. | LOW | Map each finding to at least CWE ID and OWASP Top 10 category. The AI model can do this as part of structured output. |
| Code snippet with line reference | Every tool highlights the exact code location. CodeRabbit gives line-by-line suggestions, Snyk shows inline in PR, Semgrep shows in-PR remediation. | LOW | Show the vulnerable code block with file path and line numbers. Before/after diffs when fixes are available. |
| Remediation guidance | Snyk provides "in-line remediation recommendations", Semgrep gives "step-by-step remediation instructions in their PRs", GHAS provides fix explanations. | LOW | Each finding needs a clear "how to fix" section. This is the baseline -- auto-fix is the differentiator layer above this. |
| GitHub integration via PR events | CodeRabbit installs as GitHub App, Snyk runs in CI/PR, Semgrep integrates in PRs, SonarCloud decorates PRs. The trigger mechanism is expected. | MEDIUM | ClawGuard uses @mention trigger which is slightly different (on-demand vs auto-run) but serves the same purpose. |
| Per-repo configuration | CodeRabbit has `.coderabbit.yaml`, Semgrep has `.semgrep.yml`, SonarCloud has `sonar-project.properties`. Configurable behavior is expected. | LOW | `.clawguard/config.yml` is already planned. Keep it simple: severity thresholds, enabled phases, model selection. |

### Differentiators (Competitive Advantage)

Features that no single competitor combines in one tool. These are what win the hackathon.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Agentic auto-fix loop (find, fix, validate, commit, re-audit)** | CodeRabbit has 1-click fix. Copilot Autofix suggests fixes. Snyk Agent Fix auto-patches (~80% accuracy). But NONE do the full loop: detect vulnerability, generate fix in sandbox, validate the fix, commit to PR branch, then re-audit the fixed code and post updated results. This is the strongest "agent autonomy" signal for the AI agents judge. | HIGH | This is the flagship feature. The re-audit step is what separates it from all competitors. Must be demo-reliable. Vercel Sandbox is critical for safe execution. |
| **Interactive web report with visualizations** | No competitor offers a standalone, interactive security report page. CodeRabbit posts markdown comments. Snyk shows findings in their dashboard. SonarCloud has a web dashboard but it is a full SaaS product, not per-PR. ClawGuard's per-PR report at `/report/[owner]/[repo]/[pr]` with score gauge, OWASP charts, Mermaid diagrams, and expandable cards is genuinely novel. | HIGH | This is the visual wow factor for the cybersecurity judge. Must look polished -- dark theme, professional density, not toy-like. Recharts for charts, Mermaid for data flow diagrams. |
| **Security score (0-100 numeric + A-F grade)** | SonarCloud has letter grades (A-E) per dimension (reliability, security, maintainability). But no competitor offers a single composite security score with grade that is clearly communicated in PR comments AND tracked over time. The simplicity of "your PR security score is 72/100 (C)" is immediately understandable. | MEDIUM | Score deductions by severity are straightforward. The scoring algorithm should be transparent (e.g., -20 per critical, -10 per high, -5 per medium, -2 per low). |
| **Compliance framework mapping (PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS)** | Enterprise tools like Snyk Enterprise have compliance reporting behind expensive tiers. Aikido has SOC 2/ISO 27001. But none of the developer-facing PR tools map individual code findings to specific compliance controls in an accessible way. This signals enterprise readiness to the YC judge. | MEDIUM | Use OWASP ASVS as the bridge -- ASVS requirements are available in JSON/CSV and map to compliance frameworks. Each finding can reference which ASVS requirement it violates, then fan out to PCI DSS / SOC 2 / HIPAA / NIST controls. |
| **Threat modeling as a review phase** | No PR review tool includes threat modeling. CodeRabbit reviews code quality. Snyk/Semgrep find known vulnerability patterns. GHAS runs CodeQL queries. None generate a threat model with attack paths and data flow analysis for the changed code. | MEDIUM | This is the 3rd phase of ClawGuard's pipeline. Attack path diagrams via Mermaid. Data flow analysis showing where untrusted input travels. This deeply impresses security-track judges. |
| **Follow-up conversational chat in PR thread** | CodeRabbit has this ("real-time chat with bot to discuss reviews"). But CodeRabbit is a general code review tool, not security-focused. A security-focused conversational agent that can answer "is this finding a false positive?" or "explain the attack vector" with full PR context is differentiated. | MEDIUM | Use Vercel Chat SDK with GitHub adapter. Must maintain conversation state (Upstash Redis). Responds with security-domain expertise, not generic code review. |
| **Custom security policies via natural language** | Semgrep has a powerful but complex rule DSL. CodeRabbit allows natural-language instructions. ClawGuard's `.clawguard/policies.yml` lets teams write security policies in plain English that get injected into the AI prompt. This is simpler than Semgrep rules and more security-focused than CodeRabbit instructions. | LOW | Example: "All database queries must use parameterized statements" or "JWT tokens must have expiry less than 1 hour". These get injected into the agent's system prompt. |
| **Before/after code diffs with syntax highlighting** | While CodeRabbit shows inline suggestions and Copilot Autofix shows suggested changes, presenting before/after diffs in a standalone report with full syntax highlighting is a more polished presentation. Combined with the interactive report, this becomes a differentiator. | LOW | Use a diff viewer component (e.g., react-diff-viewer or custom with shiki). Show in the web report alongside each finding. |

### Anti-Features (Commonly Requested, Often Problematic)

Features to deliberately NOT build. Critical for hackathon scope control.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Traditional SAST engine / custom scanner** | "Real" security tools have their own scanners | Building a scanner takes years. Snyk has 25M+ data flow cases. Semgrep has thousands of rules. You cannot compete on detection engine quality at a hackathon. | Use AI-driven analysis. The LLM IS the scanner. It can reason about code patterns, data flows, and business logic that rule-based scanners miss. Frame this as a strength, not a limitation. |
| **Dependency scanning (SCA)** | Snyk, Dependabot, Socket.dev all do this. Seems table stakes. | Already solved by GitHub Dependabot (free, built-in). Duplicating this adds complexity without novelty. Judges know Dependabot exists. | Mention in docs that ClawGuard focuses on first-party code vulnerabilities. Dependency scanning is complementary, not competitive. |
| **Secret scanning** | GitHub's secret scanning with push protection handles this. Seems expected. | GitHub already blocks pushes with secrets. Re-implementing this adds zero value and may produce inferior results vs GitHub's partner program with 200+ providers. | Let GitHub handle secrets. ClawGuard focuses on code logic vulnerabilities, not credential leaks. |
| **IDE integration** | Snyk, SonarCloud, CodeRabbit all have IDE plugins. | Massive scope increase. IDE plugins require separate builds for VS Code, JetBrains, etc. Zero demo value at a hackathon -- judges see the PR flow, not your IDE. | PR + web report surfaces are sufficient. If asked, say "IDE integration is on the roadmap." |
| **Multi-platform support (GitLab, Bitbucket)** | CodeRabbit, Snyk, SonarCloud all support multiple platforms. | Triples integration complexity for zero hackathon value. Judges demo on GitHub. | GitHub-only. Platform abstraction can be added later if this becomes a real product. |
| **Custom rule DSL** | Semgrep's power comes from its rule language. Seems like a requirement. | Building a DSL is a multi-month effort. Semgrep has invested years in theirs. A half-baked DSL looks worse than no DSL. | Natural-language policies in `.clawguard/policies.yml` injected into the AI prompt. This is actually more flexible and more aligned with the "AI-first" positioning. |
| **Historical vulnerability database** | Snyk has a massive vuln DB. NVD/CVE databases exist. | You cannot build or maintain a vulnerability database. This is a data moat, not a feature. | The LLM's training data includes knowledge of CVEs and vulnerability patterns. For known vulnerabilities, reference CWE IDs which link to external databases. |
| **Real-time / streaming analysis display** | Looks cool to see analysis happening live. | Adds significant frontend complexity (SSE/WebSocket for progress updates). The webhook-to-comment flow is asynchronous by nature. | Post a "ClawGuard is analyzing your PR..." placeholder comment, then update it when analysis completes. Simple, reliable, sufficient for demo. |

## Feature Dependencies

```
[GitHub Webhook Handler]
    +--requires--> [PR Code Checkout (Vercel Sandbox)]
                       +--requires--> [Phase 1: Code Quality Review]
                       +--requires--> [Phase 2: Vulnerability Scan]
                       +--requires--> [Phase 3: Threat Model]
                                          +--all feed into--> [Structured JSON Output]
                                                                  |
                       +------<------<------<------<------<-------+
                       |                                          |
                       v                                          v
              [Security Score Calculation]              [PR Summary Card]
                       |                                          |
                       v                                          v
              [Interactive Web Report]                  [Report Link in PR]
                       |
                       v
              [Compliance Mapping Table]

[Auto-Fix Loop] --requires--> [Structured JSON Output (findings)]
    +--requires--> [Vercel Sandbox (for fix generation + validation)]
    +--requires--> [GitHub API / Octokit (for committing fixes)]
    +--triggers--> [Re-Audit (runs pipeline again)]
    +--updates--> [PR Summary Card (new score)]

[Follow-Up Chat] --requires--> [GitHub Webhook Handler (@mention detection)]
    +--requires--> [Conversation State (Upstash Redis)]
    +--enhances--> [PR Summary Card (action buttons)]

[Dashboard] --requires--> [GitHub OAuth (NextAuth.js)]
    +--requires--> [Audit Storage (Upstash Redis)]
    +--enhances--> [Interactive Web Report (navigation context)]

[Per-Repo Config] --enhances--> [All Pipeline Phases (behavior customization)]
[Custom Policies] --enhances--> [All Pipeline Phases (injected into prompts)]
```

### Dependency Notes

- **Auto-Fix Loop requires Structured JSON Output:** The fix agent needs to know exactly what to fix (file, line, vulnerability type, suggested approach) from the scan output.
- **Auto-Fix Loop requires Vercel Sandbox:** Fixes must be generated and validated in isolation. The sandbox clones the repo, applies fixes, and can run basic validation before committing.
- **Re-Audit depends on Auto-Fix completion:** After fixes are committed, the entire 3-phase pipeline runs again on the updated code to produce a new score.
- **Interactive Web Report requires Structured JSON Output:** The report page renders findings, scores, diagrams, and compliance mappings from the stored JSON.
- **Dashboard requires OAuth + Audit Storage:** Must authenticate users and retrieve stored audit results to show repo overview and history.
- **Follow-Up Chat requires Conversation State:** Must track conversation context across multiple @mention replies in the PR thread.
- **Config/Policies enhance all phases:** These are read at pipeline start and affect all downstream behavior, but the pipeline works without them (with sensible defaults).

## MVP Definition

### Launch With (Hackathon Demo v1)

Minimum viable for the 3-minute demo. These must work end-to-end without failure.

- [ ] **GitHub webhook receiving @mention and triggering pipeline** -- Without this, nothing works
- [ ] **3-phase security pipeline producing structured JSON** -- Core analysis engine
- [ ] **PR summary card with findings, severity badges, score, report link** -- Visible output in GitHub
- [ ] **Interactive web report with score gauge, findings list, code snippets** -- Visual wow factor
- [ ] **At least one auto-fix cycle (find, fix, commit, re-audit)** -- Agent autonomy demo
- [ ] **Demo repo with planted vulnerabilities** -- Reliable demo, no surprises

### Add After Core Works (v1.x -- if time permits)

Features to layer on once the core loop is solid.

- [ ] **OWASP distribution chart in report** -- Adds visual richness, requires Recharts
- [ ] **Mermaid data flow / attack path diagrams** -- Impressive for security judges, moderate complexity
- [ ] **Compliance mapping table** -- PCI DSS, SOC 2, HIPAA, NIST mapping in report
- [ ] **Follow-up chat in PR thread** -- "Ask ClawGuard about this finding"
- [ ] **Before/after code diffs with syntax highlighting** -- Polish for the report
- [ ] **Action buttons in PR card (Auto-Fix, Auto-Fix All, View Report)** -- Interactive PR experience

### Future Consideration (v2+ -- post-hackathon)

Features to explicitly defer.

- [ ] **Dashboard with GitHub OAuth** -- Real product signal but not demo-critical; can be shown as static mockup if needed
- [ ] **Per-repo config and custom policies** -- Nice for "looks like a real product" but demo works without it
- [ ] **Score trend charts over time** -- Requires multiple audits; single-demo doesn't show trends
- [ ] **v0 SDK for report generation** -- Novel but risky; pre-built report components are more reliable for demo

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Hackathon Demo Value |
|---------|------------|---------------------|----------|---------------------|
| GitHub webhook + @mention trigger | HIGH | MEDIUM | P1 | Essential -- entry point |
| 3-phase security pipeline | HIGH | HIGH | P1 | Essential -- core analysis |
| PR summary card with findings | HIGH | MEDIUM | P1 | Essential -- visible output |
| Interactive web report (basic) | HIGH | MEDIUM | P1 | Essential -- visual wow |
| Security score (0-100 + grade) | HIGH | LOW | P1 | Essential -- instant clarity |
| Auto-fix + commit cycle | HIGH | HIGH | P1 | Essential -- agent demo |
| Re-audit after fix | HIGH | MEDIUM | P1 | Essential -- completes loop |
| Demo repo with planted vulns | HIGH | LOW | P1 | Essential -- reliable demo |
| CWE/OWASP categorization | MEDIUM | LOW | P1 | Expected by security judges |
| Mermaid diagrams (data flow) | MEDIUM | MEDIUM | P2 | Strong visual for security track |
| OWASP distribution chart | MEDIUM | LOW | P2 | Report polish |
| Compliance mapping | MEDIUM | MEDIUM | P2 | Enterprise signal for YC judge |
| Follow-up chat in PR | MEDIUM | MEDIUM | P2 | Agent capability signal |
| Before/after code diffs | MEDIUM | LOW | P2 | Report polish |
| Action buttons in PR | LOW | MEDIUM | P2 | Interactive feel |
| Custom policies (.yml) | LOW | LOW | P3 | "Real product" signal |
| Per-repo config | LOW | LOW | P3 | "Real product" signal |
| Dashboard with OAuth | LOW | HIGH | P3 | Can mock if time allows |
| Score trend charts | LOW | MEDIUM | P3 | Requires multiple audits |
| v0 SDK report generation | MEDIUM | HIGH | P3 | Novel but risky for demo |

**Priority key:**
- P1: Must work for demo (8 features -- the core loop)
- P2: Add if time permits (visual polish + extended capabilities)
- P3: Defer or mock (nice signals but not demo-critical)

## Competitor Feature Analysis

| Feature | CodeRabbit | Snyk Code | Semgrep | GHAS/Copilot | SonarCloud | Aikido | **ClawGuard** |
|---------|-----------|-----------|---------|--------------|------------|--------|-------------|
| PR comments with findings | Yes (summary + inline) | Yes (inline) | Yes (inline) | Yes (alerts) | Yes (decoration) | Yes (PR generation) | Yes (summary card + report link) |
| Severity classification | Yes | Yes | Yes | Yes | Yes (A-E ratings) | Yes | Yes (0-100 score + A-F grade) |
| CWE/OWASP mapping | Partial | Yes (CWE) | Yes (CWE/OWASP) | Yes (CWE) | Partial | Partial | Yes (CWE + OWASP Top 10) |
| Auto-fix | 1-click + "Fix with AI" | Agent Fix (~80%) | Suggestions only | Copilot Autofix (suggestions) | No | AutoFix + bulk fix | **Full loop: fix, validate, commit, re-audit** |
| Interactive web report | No | Snyk dashboard (SaaS) | Scan reports | GitHub Security tab | SonarCloud dashboard | Dashboard | **Per-PR standalone report page** |
| Threat modeling | No | No | No | No | No | No | **Yes (Phase 3)** |
| Compliance mapping | No | Enterprise only | No | No | Partial | SOC 2/ISO 27001 | **PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS** |
| Data flow diagrams | No | No | No | No | No | No | **Mermaid diagrams per finding** |
| Conversational follow-up | Yes (chat in PR) | No | No | No | No | No | Yes (security-focused chat) |
| Custom policies | YAML + NL instructions | Enterprise policies | Rule DSL | CodeQL queries | Quality profiles | Policies | **Natural language policies** |
| Security score trend | No | No | No | No | Quality gate history | Dashboard | Score trend over audits |
| Per-repo config | .coderabbit.yaml | Org-level | .semgrep.yml | CodeQL config | sonar-project.properties | Org-level | .clawguard/config.yml |
| Standalone deployment | No (SaaS) | No (SaaS) | Cloud + self-hosted | GitHub-native | No (SaaS) | No (SaaS) | **Single Next.js on Vercel** |

### Key Competitive Gaps ClawGuard Fills

1. **No competitor does the full agentic loop.** CodeRabbit's 1-click fix and Copilot Autofix both generate suggestions that developers must review and merge. Snyk Agent Fix auto-patches but does not re-audit. ClawGuard's find-fix-validate-commit-re-audit loop is genuinely autonomous.

2. **No competitor offers a per-PR interactive security report.** SonarCloud and Snyk have SaaS dashboards, but they are account-level views, not shareable per-PR report pages. ClawGuard's `/report/[owner]/[repo]/[pr]` is a unique artifact that can be shared, bookmarked, and shown to non-technical stakeholders.

3. **No competitor includes threat modeling in PR review.** This is entirely novel in the PR review space. Traditional threat modeling is a manual process done in design phases. Running it on code changes with AI is an original contribution.

4. **No competitor maps individual PR findings to compliance frameworks.** Enterprise tools have compliance reporting at the org/project level, but mapping specific code findings in a PR to PCI DSS 6.5.x controls or NIST 800-53 controls is not done by any PR-level tool.

## Sources

- CodeRabbit homepage and feature descriptions (coderabbit.ai) -- fetched 2026-03-27
- Snyk Code product page (snyk.io/product/snyk-code/) -- fetched 2026-03-27
- Semgrep Code product page (semgrep.dev/products/semgrep-code) -- fetched 2026-03-27
- GitHub Advanced Security features page (github.com/features/security) -- fetched 2026-03-27
- GitHub Copilot Autofix documentation (docs.github.com) -- fetched 2026-03-27
- Aikido Security homepage (aikido.dev) -- fetched 2026-03-27
- SonarSource/SonarCloud product pages (sonarsource.com) -- fetched 2026-03-27
- OWASP ASVS project page (owasp.org) -- fetched 2026-03-27
- Training data knowledge for established product features (SonarCloud quality gates, Semgrep rule DSL, Snyk vulnerability DB) -- MEDIUM confidence, well-established products with stable feature sets

---
*Feature research for: AI-powered GitHub PR security review agents*
*Researched: 2026-03-27*
