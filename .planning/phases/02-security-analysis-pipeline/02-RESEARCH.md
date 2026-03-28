# Phase 2: Security Analysis Pipeline - Research

**Researched:** 2026-03-27
**Domain:** AI agent orchestration, structured output, security analysis, GFM card rendering
**Confidence:** HIGH

## Summary

Phase 2 transforms the single-pass plain-text agent in `lib/review.ts` into a 3-phase sequential analysis pipeline with Zod-validated structured output, score calculation, and a GFM summary card posted to the PR thread. The core technical challenge is orchestrating three `ToolLoopAgent` instances sequentially within a single Vercel Sandbox session, each producing structured output via `Output.object({ schema })`, then compositing the results into a unified `AuditData` structure stored in Redis.

The AI SDK's `ToolLoopAgent` natively supports structured output through its `output` setting, which accepts `Output.object({ schema: zodSchema })`. The agent runs its tool loop, and when it stops calling tools, the final step produces JSON matching the Zod schema. The result is available as `result.output` (typed). This eliminates the need for post-hoc parsing of free-text agent output. Chat SDK's `thread.post()` returns a `SentMessage` with an `edit()` method, already proven in Phase 1 for live progress updates.

On GitHub, Chat SDK cards render as GFM Markdown -- tables become GFM tables, buttons become plain text, links become `[label](url)`. For the summary card, plain GFM template strings produce the same visual result as JSX cards with less complexity. The score calculation is a pure function with a fixed deduction formula (no AI involved).

**Primary recommendation:** Use three `ToolLoopAgent` instances with `Output.object()` for structured output, sharing a single Sandbox session. Build the summary card as a GFM markdown string. Use the existing `status.edit()` pattern for live phase progress.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Score-first layout with findings table. ClawGuard branded header (e.g., "ClawGuard Security Audit: 72/100 (C)").
- **D-02:** Severity count badges inline below the score (CRITICAL: N | HIGH: N | MEDIUM: N | LOW: N).
- **D-03:** Markdown table showing top 5 findings by severity (columns: Severity | Finding | Location).
- **D-04:** "View Full Report" link at the bottom pointing to `/report/[owner]/[repo]/[pr]`.
- **D-05:** Card table only shows MEDIUM+ severity findings. LOW and INFO are stored in audit JSON and appear in the full report, not the card.
- **D-06:** Full 3-phase sequential analysis -- three separate ToolLoopAgent calls, each feeding context to the next. Phase 1 (Code Quality Review) -> Phase 2 (Vulnerability Scan) -> Phase 3 (Threat Model).
- **D-07:** Live phase progress updates -- bot edits the PR comment in real-time as each analysis phase completes, showing checkmarks for completed phases and a spinner/hourglass for the current phase. Final summary card replaces the progress message.
- **D-08:** Each finding includes a confidence indicator (high/medium/low) to acknowledge LLM uncertainty.
- **D-09:** All severities stored in the audit JSON data. Card filters to MEDIUM+ for impact.
- **D-10:** Fixed deduction formula: CRITICAL=-25, HIGH=-15, MEDIUM=-8, LOW=-3, INFO=-1. Starting score is 100. Floor at 0.
- **D-11:** Score + grade + severity badge counts shown in card. Detailed deduction breakdown lives in the full report page (Phase 4), not the card.

### Claude's Discretion
- Exact agent system prompts and prompt engineering for each analysis phase
- Zod schema structure for findings (must satisfy SCAN-05 field requirements)
- How context flows between the 3 sequential phases (full output vs. summary)
- GFM markdown formatting details for severity badges (emoji, bold, etc.)
- Error handling within individual analysis phases (retry vs. skip vs. fail)
- `AuditData` schema evolution from `string` to structured type

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCAN-02 | Phase 1 (Code Quality Review) -- summarizes PR, identifies code smells, architectural impact | ToolLoopAgent with dedicated system prompt + Output.object for structured quality findings |
| SCAN-03 | Phase 2 (Vulnerability Scan) -- detects injection flaws, hardcoded secrets, auth gaps, CSRF, IDOR, path traversal, unsafe eval, data exposure, insecure crypto, race conditions, open redirects, missing validation | ToolLoopAgent with security-focused system prompt + vulnerability finding schema |
| SCAN-04 | Phase 3 (Threat Model) -- maps attack surfaces, generates attack path analysis, assesses compound risk | ToolLoopAgent with threat modeling system prompt + threat model output schema |
| SCAN-05 | Each finding includes: severity, type, file:line location, CWE ID, OWASP Top 10 category, description, attack scenario, data flow chain, before/after code fix, compliance mapping | Zod 4 nested schema with all required fields (verified working with complex nested objects) |
| SCAN-06 | Security score: 0-100 numeric with A-F grade, deduction formula | Pure function -- no AI needed. Fixed formula per D-10 |
| CARD-01 | JSX summary card with security score (grade + numeric), severity count badges | GFM markdown string with score header and severity badge line |
| CARD-02 | Top findings table with severity, type, and location | GFM markdown table filtered to top 5 MEDIUM+ findings per D-05 |
| CARD-03 | "View Full Report" link to interactive report page | Markdown link to `/report/[owner]/[repo]/[pr]` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack**: Next.js App Router, Vercel AI SDK (`ai@6.x`), Zod 4, `@vercel/sandbox`, `@upstash/redis`, Chat SDK + GitHub adapter, `@octokit/rest`
- **AI provider**: Vercel AI Gateway via `gateway("anthropic/claude-sonnet-4.6")` -- not direct Anthropic API
- **Deployment**: Single Next.js app on Vercel -- no separate backend services
- **Design**: Dark theme, professional/dense enterprise aesthetic
- **Path alias**: `@/*` maps to repo root
- **No barrel files**: Direct imports only
- **Error handling**: Try/catch with generic messages posted to PR thread (no stack traces)
- **Sandbox lifecycle**: Create in try, stop in finally
- **maxDuration = 300** on webhook route for long-running analysis
- **Zod version**: Must be v4.x (4.3.6 installed). Note: `z.interface()` does NOT exist in installed version -- use `z.object()` only
- **Redis**: `@upstash/redis` HTTP REST for audit data; `redis@5` TCP for Chat SDK state (different clients)

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Verified |
|---------|---------|---------|----------|
| ai | 6.0.141 | ToolLoopAgent, Output.object, stepCountIs | `Output.object` confirmed via `require('ai').Output.object` |
| zod | 4.3.6 | Structured output schemas for all findings | Complex nested schemas verified working |
| @vercel/sandbox | 1.9.0 | Isolated repo clone + bash tools for agents | Already used in review.ts |
| @ai-sdk/gateway | 3.0.83 (bundled) | AI Gateway provider | `gateway("anthropic/claude-sonnet-4.6")` confirmed working |
| chat | 4.23.0 | Thread posting, message editing | `thread.post()` -> `SentMessage.edit()` pattern proven |
| @chat-adapter/github | 4.23.0 | GitHub PR comment rendering | Cards render as GFM Markdown |
| @upstash/redis | 1.37.0 | Structured audit data storage | Existing store/get helpers to be updated |
| bash-tool | 1.3.15 | Sandbox bash access for agents | Already used in review.ts |

### No New Dependencies Required
Phase 2 uses only libraries already installed. No `npm install` needed.

## Architecture Patterns

### Recommended Project Structure
```
lib/
  analysis/
    types.ts              # Zod schemas + TS types for all findings
    phase1-quality.ts     # Code quality review agent
    phase2-vuln.ts        # Vulnerability scan agent
    phase3-threat.ts      # Threat model agent
    scoring.ts            # Score calculation (pure function)
    pipeline.ts           # Orchestrator: runs 3 phases, aggregates results
  cards/
    summary-card.ts       # GFM markdown card builder
  bot.ts                  # Updated handlers with progress + card posting
  redis.ts                # Updated AuditData type (string -> structured)
  review.ts               # Updated to use pipeline, return structured data
```

### Pattern 1: ToolLoopAgent with Structured Output
**What:** Each analysis phase is a ToolLoopAgent with `output: Output.object({ schema })` that uses bash tools to explore code and produces Zod-validated findings.
**When to use:** Every analysis phase (quality, vuln, threat).
**Example:**
```typescript
// Source: verified from ai@6.0.141 type definitions
import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";

const QualityOutputSchema = z.object({
  summary: z.string(),
  findings: z.array(FindingSchema),
});

const qualityAgent = new ToolLoopAgent({
  model: gateway("anthropic/claude-sonnet-4.6"),
  tools,  // bash tools from sandbox
  output: Output.object({ schema: QualityOutputSchema }),
  stopWhen: stepCountIs(20),
  instructions: "You are a code quality reviewer...",
});

const result = await qualityAgent.generate({
  prompt: `Analyze this PR diff for code quality issues:\n\n${diff}`,
});

// result.output is typed as z.infer<typeof QualityOutputSchema>
const findings = result.output.findings;
```

### Pattern 2: Sequential Pipeline with Shared Sandbox
**What:** One sandbox session, three sequential agent calls. Each agent gets previous phase output as context.
**When to use:** The main pipeline orchestrator.
**Example:**
```typescript
// Source: pattern derived from existing review.ts + AI SDK docs
export async function runSecurityPipeline(input: PipelineInput): Promise<AuditResult> {
  const sandbox = await Sandbox.create({ /* ... */ });

  try {
    // Get diff once, share across phases
    const diff = await getDiff(sandbox, input);
    const { tools } = await createBashTool({ sandbox });

    // Phase 1: Code Quality
    const phase1 = await qualityAgent(tools, diff);

    // Phase 2: Vulnerability Scan (receives Phase 1 context)
    const phase2 = await vulnAgent(tools, diff, phase1);

    // Phase 3: Threat Model (receives Phase 1 + Phase 2 context)
    const phase3 = await threatAgent(tools, diff, phase1, phase2);

    // Aggregate and score
    const allFindings = [...phase1.findings, ...phase2.findings, ...phase3.findings];
    const score = calculateScore(allFindings);

    return { phases: { quality: phase1, vuln: phase2, threat: phase3 }, score, allFindings };
  } finally {
    await sandbox.stop();
  }
}
```

### Pattern 3: Live Progress Updates via status.edit()
**What:** Post initial message, edit in-place as each phase completes.
**When to use:** During the 3-phase analysis to show progress.
**Example:**
```typescript
// Source: existing bot.ts pattern (proven in Phase 1)
const status = await thread.post(
  `## ClawGuard Security Audit\n\n` +
  `- [ ] Phase 1: Code Quality Review\n` +
  `- [ ] Phase 2: Vulnerability Scan\n` +
  `- [ ] Phase 3: Threat Model`
);

// After Phase 1 completes:
await status.edit(
  `## ClawGuard Security Audit\n\n` +
  `- [x] Phase 1: Code Quality Review\n` +
  `- [ ] Phase 2: Vulnerability Scan\n` +
  `- [ ] Phase 3: Threat Model`
);
// ... and so on
```

### Pattern 4: GFM Summary Card as Markdown String
**What:** Build the summary card as a plain GFM markdown string rather than JSX cards.
**Why over JSX cards:** On GitHub, JSX cards render as GFM Markdown anyway. Plain strings are simpler, require no tsconfig changes, and produce identical visual output.
**Example:**
```typescript
// Source: derived from D-01 through D-05 decisions
export function buildSummaryCard(audit: AuditResult, pr: PRInfo): string {
  const grade = getGrade(audit.score);
  const counts = countBySeverity(audit.allFindings);
  const topFindings = audit.allFindings
    .filter(f => ['CRITICAL', 'HIGH', 'MEDIUM'].includes(f.severity))
    .sort(bySeverity)
    .slice(0, 5);

  return [
    `## ClawGuard Security Audit: ${audit.score}/100 (${grade})`,
    ``,
    `**CRITICAL:** ${counts.CRITICAL} | **HIGH:** ${counts.HIGH} | **MEDIUM:** ${counts.MEDIUM} | **LOW:** ${counts.LOW}`,
    ``,
    `| Severity | Finding | Location |`,
    `|----------|---------|----------|`,
    ...topFindings.map(f =>
      `| ${severityEmoji(f.severity)} ${f.severity} | ${f.type} | \`${f.location.file}:${f.location.line}\` |`
    ),
    ``,
    `[View Full Report ->](/report/${pr.owner}/${pr.repo}/${pr.number})`,
  ].join('\n');
}
```

### Pattern 5: Progress Callback for Pipeline-to-Bot Communication
**What:** The pipeline accepts a callback function so the bot handler can receive phase completion events without tight coupling.
**When to use:** Connecting the pipeline orchestrator to the bot's status.edit() calls.
**Example:**
```typescript
type ProgressCallback = (phase: string, status: 'running' | 'complete' | 'error') => Promise<void>;

async function runSecurityPipeline(
  input: PipelineInput,
  onProgress?: ProgressCallback
): Promise<AuditResult> {
  // ...
  await onProgress?.('quality', 'running');
  const phase1 = await qualityAgent(tools, diff);
  await onProgress?.('quality', 'complete');
  // ...
}
```

### Anti-Patterns to Avoid
- **Single monolithic agent prompt:** Do NOT combine all three phases into one massive prompt. Three focused agents produce better results than one overloaded one. D-06 locks this.
- **Creating new sandboxes per phase:** Each sandbox creation takes 10-30s. Reuse a single sandbox across all three phases.
- **Parsing free-text output with regex:** Use `Output.object({ schema })` for structured output. Never regex-parse agent text.
- **Global tsconfig jsxImportSource change:** Do NOT set `"jsxImportSource": "chat"` globally -- this breaks all React components. Use per-file pragma only if JSX cards are needed.
- **Trusting agent output without schema validation:** Always use Zod schemas. The agent may produce malformed JSON. `Output.object` handles validation and throws `NoObjectGeneratedError` on failure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured agent output | Parse agent text with regex/JSON.parse | `Output.object({ schema })` from AI SDK | Handles validation, retries, partial output, error types |
| Score calculation | Complex scoring algorithm | Fixed deduction formula (D-10) | Pure function, 15 lines of code, deterministic |
| CWE/OWASP mappings | Lookup tables of CWE->OWASP | Let the LLM agent produce them | The model knows CWE/OWASP mappings; hardcoding a lookup table is fragile and incomplete |
| Grade calculation | Complex grade algorithm | Simple threshold map | A: 90+, B: 80+, C: 70+, D: 60+, F: <60 |
| Markdown escaping | Manual string escaping | Template literals with backtick fencing | GFM handles most escaping; backtick-fence code/file paths |

**Key insight:** The LLM IS the security scanner. Don't build vulnerability detection logic in code -- the agent system prompts define what to look for, and the Zod schema enforces the output structure. The code just orchestrates, scores, and formats.

## Common Pitfalls

### Pitfall 1: Structured Output Counts as a Step
**What goes wrong:** The agent runs 20 tool-calling steps and never produces structured output because the step limit is reached before the model can generate JSON.
**Why it happens:** `Output.object` structured output generation counts as one step in the agent loop. With `stepCountIs(20)`, the agent has up to 19 tool steps + 1 output step.
**How to avoid:** Set `stopWhen: stepCountIs(25)` or higher. The agent typically needs 5-15 bash tool calls to explore code, plus 1 step for structured output.
**Warning signs:** `NoObjectGeneratedError` or `result.output` being undefined.

### Pitfall 2: Zod 4 z.interface() Does Not Exist
**What goes wrong:** Code uses `z.interface()` expecting Zod 4 API and gets `TypeError: z.interface is not a function`.
**Why it happens:** CLAUDE.md mentions `z.interface()` as a Zod 4 feature, but the installed zod@4.3.6 does NOT export `z.interface`. It may be available via a different import path or not yet released.
**How to avoid:** Use `z.object()` exclusively. Verified working for all schema needs.
**Warning signs:** TypeScript or runtime errors mentioning `z.interface`.

### Pitfall 3: Sandbox Timeout During Multi-Phase Analysis
**What goes wrong:** The sandbox times out after 5 minutes while three sequential agents are still running.
**Why it happens:** Default sandbox timeout is 5 minutes. Three agents at 1-2 minutes each = 3-6 minutes total.
**How to avoid:** Set sandbox timeout to at least 10 minutes: `timeout: 10 * 60 * 1000`. The webhook route already has `maxDuration = 300` (5 min) -- this may also need increasing or using `after()` properly.
**Warning signs:** Sandbox errors midway through Phase 2 or Phase 3.

### Pitfall 4: AuditData Type Change Breaks Existing Code
**What goes wrong:** Changing `AuditData.result` from `string` to a structured type breaks `bot.ts` handlers and potentially the report page route.
**Why it happens:** Both `onNewMention` and `onSubscribedMessage` construct `AuditData` with `result: reviewResult`. If `reviewResult` type changes, all callers must update.
**How to avoid:** Update `AuditData` interface, `storeAuditResult`, `getAuditResult`, and all callers (`bot.ts` handlers) in a single coordinated change. Update tests simultaneously.
**Warning signs:** TypeScript compile errors in bot.ts after changing redis.ts types.

### Pitfall 5: Agent Output Schema Too Complex for Model
**What goes wrong:** The agent produces partial or malformed output because the Zod schema has too many nested required fields.
**Why it happens:** LLMs sometimes struggle with very large structured outputs. A finding with 12+ required fields across nested objects is pushing the limit.
**How to avoid:** Use `.describe()` annotations on Zod fields to guide the model. Make fields that may not always apply optional (e.g., `complianceMapping` fields). Consider using `Output.array({ element: FindingSchema })` if a flat array is simpler.
**Warning signs:** `NoObjectGeneratedError`, truncated JSON, or missing fields.

### Pitfall 6: Rate Limiting on status.edit() Calls
**What goes wrong:** Too-frequent edits to the PR comment hit GitHub API rate limits or Chat SDK throttling.
**Why it happens:** If you edit the status after every minor progress event (e.g., every tool call), you can make dozens of API calls per second.
**How to avoid:** Edit only on phase transitions (3 edits total: after Phase 1, after Phase 2, after Phase 3), plus the final card replacement. This is at most 4 edits.
**Warning signs:** 403 rate limit errors from GitHub API.

## Code Examples

### Complete Finding Schema (SCAN-05 compliant)
```typescript
// Source: verified with zod@4.3.6 runtime test
import { z } from "zod";

export const SeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

export const FindingSchema = z.object({
  severity: SeveritySchema.describe("Severity level of the finding"),
  type: z.string().describe("Vulnerability type, e.g. 'sql-injection', 'hardcoded-secret'"),
  location: z.object({
    file: z.string().describe("File path relative to repo root"),
    line: z.number().describe("Line number where the vulnerability exists"),
  }),
  cweId: z.string().describe("CWE identifier, e.g. 'CWE-89'"),
  owaspCategory: z.string().describe("OWASP Top 10 2021 category, e.g. 'A03:2021-Injection'"),
  description: z.string().describe("Detailed description of the vulnerability"),
  attackScenario: z.string().describe("Realistic attack scenario exploiting this vulnerability"),
  confidence: ConfidenceSchema.describe("Confidence level of this finding"),
  dataFlow: z.object({
    source: z.string().describe("Data entry point, e.g. 'req.body.username'"),
    transform: z.string().describe("How data is transformed, e.g. 'string concatenation'"),
    sink: z.string().describe("Where tainted data reaches, e.g. 'db.query()'"),
  }).describe("Source -> Transform -> Sink data flow chain"),
  fix: z.object({
    before: z.string().describe("Vulnerable code snippet"),
    after: z.string().describe("Fixed code snippet"),
  }).describe("Before/after code fix"),
  complianceMapping: z.object({
    pciDss: z.string().optional().describe("PCI DSS reference"),
    soc2: z.string().optional().describe("SOC 2 control reference"),
    hipaa: z.string().optional().describe("HIPAA reference"),
    nist: z.string().optional().describe("NIST 800-53 control"),
    owaspAsvs: z.string().optional().describe("OWASP ASVS reference"),
  }).describe("Compliance framework mappings"),
});

export type Finding = z.infer<typeof FindingSchema>;
```

### Score Calculation (SCAN-06)
```typescript
// Source: D-10 fixed deduction formula
import type { Finding } from "./types";

const DEDUCTIONS: Record<string, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 1,
};

const GRADE_THRESHOLDS: [number, string][] = [
  [90, "A"], [80, "B"], [70, "C"], [60, "D"],
];

export function calculateScore(findings: Finding[]): { score: number; grade: string } {
  const totalDeduction = findings.reduce(
    (sum, f) => sum + (DEDUCTIONS[f.severity] ?? 0),
    0
  );
  const score = Math.max(0, 100 - totalDeduction);
  const grade = GRADE_THRESHOLDS.find(([min]) => score >= min)?.[1] ?? "F";
  return { score, grade };
}
```

### Updated AuditData Interface
```typescript
// Source: evolution from existing lib/redis.ts
import type { Finding } from "./analysis/types";

export interface PhaseResult {
  summary: string;
  findings: Finding[];
}

export interface AuditResult {
  phases: {
    quality: PhaseResult;
    vulnerability: PhaseResult;
    threatModel: PhaseResult;
  };
  allFindings: Finding[];
  score: number;
  grade: string;
  severityCounts: Record<string, number>;
}

export interface AuditData {
  result: AuditResult;  // was: string
  timestamp: string;
  pr: { owner: string; repo: string; number: number; title: string };
  status: "processing" | "complete" | "error";
}
```

### ToolLoopAgent with Output.object (Verified API)
```typescript
// Source: ai@6.0.141 type definitions (index.d.ts lines 3240-3462)
import { ToolLoopAgent, Output, stepCountIs } from "ai";

// Confirmed exports via runtime:
// - Output.object: function (returns Output<OBJECT, DeepPartial<OBJECT>, never>)
// - Output.array: function
// - Output.text: function
// - ToolLoopAgent: function (constructor)
// - stepCountIs: function

// ToolLoopAgentSettings accepts: output?: OUTPUT (line 3289)
// GenerateTextResult has: output: InferCompleteOutput<OUTPUT> (line 3239)

const agent = new ToolLoopAgent({
  model: gateway("anthropic/claude-sonnet-4.6"),
  tools,
  output: Output.object({ schema: MySchema }),
  stopWhen: stepCountIs(25),
  instructions: "System prompt here...",
});

const result = await agent.generate({ prompt: "..." });
// result.output is typed as z.infer<typeof MySchema>
```

### Chat SDK SentMessage.edit() API
```typescript
// Source: chat@4.23.0 type definitions
// thread.post(message) returns Promise<SentMessage>
// SentMessage.edit(newContent) accepts: string | PostableMessage | ChatElement
// SentMessage.edit() returns Promise<SentMessage>

const status = await thread.post("Starting analysis...");
await status.edit("Phase 1 complete..."); // Returns updated SentMessage
await status.edit("All phases complete. Summary card below.");
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateText` + manual loop | `ToolLoopAgent` class | AI SDK 6.x | Reduces boilerplate, built-in step counting |
| `experimental_output` | `output` (stable) | AI SDK 6.x | No longer experimental; use `result.output` |
| Free-text agent output + regex parse | `Output.object({ schema })` | AI SDK 6.x | Type-safe, Zod-validated structured output |
| `z.interface()` (Zod 4 docs) | `z.object()` | Current | z.interface not available in installed 4.3.6 |

**Deprecated/outdated:**
- `experimental_output` on GenerateTextResult -- use `output` instead (both exist, `experimental_output` marked deprecated)
- Manual `JSON.parse(result.text)` for structured output -- use `Output.object` instead

## Open Questions

1. **Sandbox timeout vs webhook maxDuration alignment**
   - What we know: Sandbox default timeout is 5 min (set in review.ts). Webhook maxDuration is 300s (5 min). Three phases may take 3-6 minutes total.
   - What's unclear: Whether `after()` keeps the function alive beyond maxDuration on Vercel. The sandbox timeout and webhook timeout are independent.
   - Recommendation: Increase sandbox timeout to 10 min. Keep maxDuration=300 and rely on the existing `after()` pattern which was proven in Phase 1.

2. **Context volume between phases**
   - What we know: Phase 1 output feeds Phase 2, Phase 2 feeds Phase 3. Each phase output includes a summary + findings array.
   - What's unclear: Whether passing full findings JSON from prior phases will exceed token limits for later phases.
   - Recommendation: Pass the summary string + a condensed findings list (severity, type, location only) to subsequent phases rather than the full output with code snippets. Keep full output for the final aggregation.

3. **NoObjectGeneratedError handling**
   - What we know: `Output.object` throws `NoObjectGeneratedError` when the model cannot produce valid JSON matching the schema. Error includes `text`, `response`, `usage`, `cause`.
   - What's unclear: How reliably Claude Sonnet 4.6 produces valid JSON for complex schemas with 12+ fields.
   - Recommendation: Wrap each phase in try/catch. On `NoObjectGeneratedError`, retry once with a simplified prompt. If still failing, produce a partial result with the error logged.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-02 | Phase 1 agent produces code quality findings | unit | `npx vitest run tests/analysis/phase1-quality.test.ts -t "SCAN-02"` | Wave 0 |
| SCAN-03 | Phase 2 agent produces vulnerability findings | unit | `npx vitest run tests/analysis/phase2-vuln.test.ts -t "SCAN-03"` | Wave 0 |
| SCAN-04 | Phase 3 agent produces threat model output | unit | `npx vitest run tests/analysis/phase3-threat.test.ts -t "SCAN-04"` | Wave 0 |
| SCAN-05 | Finding schema includes all required fields | unit | `npx vitest run tests/analysis/types.test.ts -t "SCAN-05"` | Wave 0 |
| SCAN-06 | Score calculation with correct deductions and grades | unit | `npx vitest run tests/analysis/scoring.test.ts -t "SCAN-06"` | Wave 0 |
| CARD-01 | Summary card includes score, grade, severity badges | unit | `npx vitest run tests/cards/summary-card.test.ts -t "CARD-01"` | Wave 0 |
| CARD-02 | Summary card includes findings table (top 5, MEDIUM+) | unit | `npx vitest run tests/cards/summary-card.test.ts -t "CARD-02"` | Wave 0 |
| CARD-03 | Summary card includes "View Full Report" link | unit | `npx vitest run tests/cards/summary-card.test.ts -t "CARD-03"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/analysis/types.test.ts` -- Zod schema validation tests for Finding, AuditResult (SCAN-05)
- [ ] `tests/analysis/scoring.test.ts` -- Score calculation tests with edge cases (SCAN-06)
- [ ] `tests/analysis/phase1-quality.test.ts` -- Phase 1 agent mock tests (SCAN-02)
- [ ] `tests/analysis/phase2-vuln.test.ts` -- Phase 2 agent mock tests (SCAN-03)
- [ ] `tests/analysis/phase3-threat.test.ts` -- Phase 3 agent mock tests (SCAN-04)
- [ ] `tests/cards/summary-card.test.ts` -- Card builder tests (CARD-01, CARD-02, CARD-03)
- [ ] Update `tests/review.test.ts` -- Existing tests must be updated for new structured return type
- [ ] Update `tests/redis.test.ts` -- Existing tests must be updated for new AuditData interface

### Existing Tests to Update
| Test File | Current State | Required Change |
|-----------|--------------|-----------------|
| `tests/review.test.ts` | Passes (mocks ToolLoopAgent returning `{ text }`) | Must mock `Output.object`, check `result.output` instead of `result.text` |
| `tests/redis.test.ts` | Passes (stores `AuditData` with `result: string`) | Must update test data to use structured `AuditResult` type |
| `tests/bot.test.ts` | Passes (source code analysis) | Must verify progress update pattern and card posting |

## Sources

### Primary (HIGH confidence)
- `ai@6.0.141` type definitions (`node_modules/ai/dist/index.d.ts`) -- ToolLoopAgent, Output.object, GenerateTextResult APIs
- `ai@6.0.141` runtime verification -- `Output.object`, `Output.array`, `ToolLoopAgent`, `stepCountIs` confirmed exported
- `zod@4.3.6` runtime verification -- complex nested schemas with arrays, enums, optional fields confirmed working; `z.interface()` confirmed NOT available
- `chat@4.23.0` type definitions -- `thread.post()` returns `SentMessage` with `edit()` method
- AI SDK Agents docs: https://ai-sdk.dev/docs/foundations/agents -- ToolLoopAgent usage patterns
- AI SDK Structured Data docs: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data -- Output.object with generateText

### Secondary (MEDIUM confidence)
- Chat SDK Cards docs: https://chat-sdk.dev/docs/cards -- JSX card components, GitHub renders as GFM Markdown
- Chat SDK GitHub adapter docs: https://chat-sdk.dev/docs/adapters/github -- "Card format: GFM Markdown", tables as GFM, buttons as text
- Chat SDK Streaming docs: https://chat-sdk.dev/docs/streaming -- post-and-edit fallback pattern, streaming capabilities

### Tertiary (LOW confidence)
- None -- all critical claims verified via installed package type definitions or runtime tests

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries installed and verified, APIs confirmed via type definitions and runtime
- Architecture: HIGH -- ToolLoopAgent + Output.object pattern confirmed in AI SDK types; existing bot patterns proven
- Pitfalls: HIGH -- z.interface verified absent; sandbox timeout math calculated; structured output step counting confirmed in docs
- Schemas: HIGH -- Zod 4 complex nested schema validated at runtime with real test data

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- all locked dependency versions)
