# Phase 3: Auto-Fix & Commit Loop - Research

**Researched:** 2026-03-28
**Domain:** AI agent fix generation, sandbox validation, GitHub commit API, Chat SDK interactive cards
**Confidence:** HIGH

## Summary

Phase 3 adds autonomous fix generation and commit capabilities to ClawGuard. The agent generates fixes for discovered vulnerabilities in a Vercel Sandbox, validates them (type check + lint + tests), commits validated fixes to the PR branch via the Octokit Contents API, and re-audits the code to prove the fixes work. Users trigger fixes via text commands in the PR thread (`@clawguard fix all`, `@clawguard fix <finding>`), and the summary card is converted to Chat SDK JSX format with visible action labels and a clickable "View Report" link.

A critical finding from this research is that **GitHub does not support interactive action buttons in PR comments**. The Chat SDK GitHub adapter renders `Button` components as bold text (`**[Label]**`) that is not clickable, while `LinkButton` components render as clickable markdown links. This means the `onAction` handler will never fire from GitHub interactions. The primary trigger mechanism for fixes MUST be text commands via `@mention` in the PR thread, with `LinkButton` used for "View Report" (which navigates to a URL). Regular `Button` components serve as visual labels indicating available text commands.

**Primary recommendation:** Build the fix pipeline as a new `lib/fix/` module with tiered approach (fast-path from stored `fix.after`, fallback to ToolLoopAgent). Use text commands as the primary fix trigger on GitHub. Convert the summary card to JSX Card format with text instructions for available commands and a LinkButton for the report page.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Both action buttons AND text commands supported. Action buttons in the summary card for visual polish; text commands via @mention for power users.
- **D-02:** Action buttons require Chat SDK JSX Card components -- add `jsxImportSource: "chat"` to tsconfig and wire `bot.onAction` handler.
- **D-03:** Text commands require intent detection in the existing `onSubscribedMessage` handler to branch into the fix flow vs. re-audit vs. general response.
- **D-04:** Tiered approach -- try `Finding.fix.after` from stored audit first (fast path). If sandbox validation fails, fall back to a ToolLoopAgent (robust path).
- **D-05:** Fast path: apply `fix.after` content directly to the file in sandbox, run validation. No LLM call needed.
- **D-06:** Fallback path: spawn a ToolLoopAgent in the sandbox with the vulnerable file, finding details, and validation feedback. Agent iterates until fix passes validation or gives up.
- **D-07:** Full validation suite -- type check (`tsc --noEmit` for TS projects) + linting (auto-detect eslint/biome config) + run existing test suite if present.
- **D-08:** Auto-detect available validation tools in the sandbox after cloning.
- **D-09:** Validation must pass ALL available checks before the fix is committed.
- **D-10:** Skip and report -- post a brief failure note for that finding and continue to next.
- **D-11:** "Fix All" processes CRITICAL and HIGH findings sequentially, skipping failures.
- **D-12:** Final summary shows which findings were fixed vs. skipped.

### Claude's Discretion
- Commit message format for auto-fix commits (should reference the finding type and CWE)
- How to structure the fix confirmation message in the PR thread
- Whether to create one commit per fix or batch commits
- Sandbox lifecycle management (reuse sandbox across fixes vs. fresh sandbox per fix)
- How the re-audit integrates with the existing `reviewPullRequest` pipeline
- ToolLoopAgent prompt engineering for the fallback fix generation
- How to auto-detect validation tools in the sandbox

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIX-01 | Agent generates fix for a specific finding in a new Vercel Sandbox | Sandbox SDK `writeFiles()` for applying fixes, `runCommand()` for validation. Tiered approach: fast-path from `fix.after`, fallback to ToolLoopAgent. |
| FIX-02 | Fix is validated in sandbox (tsc --noEmit, linter, or available validation tools) | Auto-detect validation tools via `which tsc`, `ls eslint.config.*`, `ls biome.json`. Run each detected tool and gate on all passing. |
| FIX-03 | Validated fix committed to PR branch via Octokit Contents API with descriptive commit message | `octokit.repos.createOrUpdateFileContents()` -- requires file SHA (from `getContent`), Base64-encoded content, branch name, commit message. |
| FIX-04 | Bot confirms fix in PR thread with commit details | Use `thread.post()` to post fix confirmation with commit SHA, file path, finding type, and CWE ID. |
| FIX-05 | "Fix All" processes all CRITICAL and HIGH findings sequentially | Filter `auditResult.allFindings` by severity, sort by SEVERITY_ORDER, process sequentially with skip-on-failure. |
| FIX-06 | After all fixes committed, full re-audit runs on updated code | Re-call `reviewPullRequest()` with same PR details, store updated result, post new summary card. |
| FIX-07 | New summary card posted with updated security score | Re-use `buildSummaryCard()` (now JSX) with new AuditResult, post via `thread.post()`. |
| CARD-04 | Action buttons: Auto-Fix (per finding), Auto-Fix All, View Report | JSX Card with Button labels (render as bold text on GitHub) + text instructions + LinkButton for View Report. `onAction` handler wired for future platform support. |
</phase_requirements>

## Standard Stack

### Core (Already Installed -- No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vercel/sandbox | 1.9.0 | Isolated microVM for fix generation + validation | Already used in pipeline.ts. Provides writeFiles, readFileToBuffer, runCommand for fix workflow. |
| ai (Vercel AI SDK) | 6.0.141 | ToolLoopAgent for fallback fix generation | Already used in phase2-vuln.ts. ToolLoopAgent with Output.object for structured results. |
| @ai-sdk/gateway | 3.0.83 (bundled) | Model provider for fix agent | Bundled with ai@6.x. Use `gateway("anthropic/claude-sonnet-4.6")` as established in pipeline. |
| bash-tool | 1.3.15 | Bash tool creation for sandbox agents | Already used in pipeline.ts. `createBashTool({ sandbox })` gives agent file system access. |
| @octokit/rest | 22.0.1 | GitHub REST API for committing fixes | Already installed. Use `repos.createOrUpdateFileContents()` and `repos.getContent()`. |
| chat | 4.23.0 | JSX card components, bot handlers | Already installed. Use Card, CardText, Actions, Button, LinkButton components + onAction handler. |
| @chat-adapter/github | 4.23.0 | GitHub PR comment rendering | Already installed. Renders JSX cards as GFM Markdown. |
| @upstash/redis | 1.37.0 | Audit result storage | Already installed. Retrieve findings to fix, store updated results after re-audit. |

### No New Packages Required

This phase uses entirely existing dependencies. No `npm install` needed.

## Architecture Patterns

### Recommended Project Structure

```
lib/
  fix/
    index.ts            # Main fix orchestrator (fixFinding, fixAll)
    apply.ts            # Apply fix content to file in sandbox
    validate.ts         # Auto-detect and run validation tools
    commit.ts           # Commit validated fix via Octokit Contents API
    agent.ts            # Fallback ToolLoopAgent for complex fixes
    types.ts            # Fix-specific types (FixResult, FixStatus, etc.)
  cards/
    summary-card.tsx    # Converted from .ts to .tsx -- JSX Card with actions
  bot.ts                # Updated: add onAction handler + intent detection in onSubscribedMessage
  review.ts             # Unchanged (re-used for re-audit)
```

### Pattern 1: Tiered Fix Approach (D-04, D-05, D-06)

**What:** Try the fast path first (apply stored `fix.after`), fall back to ToolLoopAgent only if validation fails.
**When to use:** Every fix attempt starts with the fast path.

```typescript
// lib/fix/index.ts
import type { Finding } from "@/lib/analysis/types";

interface FixResult {
  finding: Finding;
  status: "fixed" | "skipped";
  commitSha?: string;
  error?: string;
  tier: "fast" | "agent";
}

async function fixFinding(
  sandbox: Sandbox,
  finding: Finding,
  context: FixContext
): Promise<FixResult> {
  // Fast path: apply fix.after directly
  const fastResult = await applyStoredFix(sandbox, finding);
  if (fastResult.valid) {
    return await commitFix(finding, fastResult.content, context);
  }

  // Fallback: ToolLoopAgent generates a fresh fix
  const agentResult = await generateFixWithAgent(sandbox, finding, fastResult.errors);
  if (agentResult.valid) {
    return await commitFix(finding, agentResult.content, context);
  }

  // Both tiers failed -- skip and report
  return {
    finding,
    status: "skipped",
    error: `Validation failed after both tiers: ${agentResult.errors}`,
    tier: "agent",
  };
}
```

### Pattern 2: Sandbox Fix Application + Validation (FIX-01, FIX-02)

**What:** Apply fix content to file in sandbox, then run all available validation tools.
**When to use:** After generating fix content (from either tier).

```typescript
// lib/fix/apply.ts
async function applyStoredFix(
  sandbox: Sandbox,
  finding: Finding
): Promise<{ valid: boolean; content: string; errors: string }> {
  const filePath = finding.location.file;

  // Read original file
  const originalBuffer = await sandbox.readFileToBuffer({ path: filePath });
  const originalContent = originalBuffer?.toString("utf-8") ?? "";

  // Replace the vulnerable code block with the fix
  const fixedContent = originalContent.replace(
    finding.fix.before,
    finding.fix.after
  );

  // Write fixed file to sandbox
  await sandbox.writeFiles([
    { path: filePath, content: Buffer.from(fixedContent) },
  ]);

  // Validate
  const validation = await runValidation(sandbox);
  if (!validation.passed) {
    // Restore original file
    await sandbox.writeFiles([
      { path: filePath, content: Buffer.from(originalContent) },
    ]);
  }

  return {
    valid: validation.passed,
    content: fixedContent,
    errors: validation.errors,
  };
}
```

### Pattern 3: Auto-Detect Validation Tools (D-07, D-08)

**What:** Detect which validation tools are available in the cloned repo and run all of them.
**When to use:** After applying a fix, before committing.

```typescript
// lib/fix/validate.ts
interface ValidationResult {
  passed: boolean;
  errors: string;
  tools: string[];  // Which tools were detected and run
}

async function runValidation(sandbox: Sandbox): Promise<ValidationResult> {
  const detected: string[] = [];
  const errors: string[] = [];

  // Check for TypeScript
  const tscCheck = await sandbox.runCommand("ls", ["tsconfig.json"]);
  if (tscCheck.exitCode === 0) {
    detected.push("tsc");
    const tsc = await sandbox.runCommand("npx", ["tsc", "--noEmit"]);
    if (tsc.exitCode !== 0) {
      errors.push(`tsc: ${await tsc.stderr()}`);
    }
  }

  // Check for ESLint (flat config or legacy)
  const eslintConfigs = ["eslint.config.js", "eslint.config.mjs", ".eslintrc.js", ".eslintrc.json"];
  for (const config of eslintConfigs) {
    const check = await sandbox.runCommand("ls", [config]);
    if (check.exitCode === 0) {
      detected.push("eslint");
      const eslint = await sandbox.runCommand("npx", ["eslint", "."]);
      if (eslint.exitCode !== 0) {
        errors.push(`eslint: ${await eslint.stderr()}`);
      }
      break;
    }
  }

  // Check for Biome
  const biomeCheck = await sandbox.runCommand("ls", ["biome.json"]);
  if (biomeCheck.exitCode === 0) {
    detected.push("biome");
    const biome = await sandbox.runCommand("npx", ["biome", "check", "."]);
    if (biome.exitCode !== 0) {
      errors.push(`biome: ${await biome.stderr()}`);
    }
  }

  // Check for test runner (package.json scripts.test)
  const pkgCheck = await sandbox.runCommand("cat", ["package.json"]);
  if (pkgCheck.exitCode === 0) {
    const pkg = JSON.parse(await pkgCheck.stdout());
    if (pkg.scripts?.test && pkg.scripts.test !== "echo \"Error: no test specified\" && exit 1") {
      detected.push("test");
      const test = await sandbox.runCommand("npm", ["test"]);
      if (test.exitCode !== 0) {
        errors.push(`test: ${await test.stderr()}`);
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors: errors.join("\n"),
    tools: detected,
  };
}
```

### Pattern 4: Commit Fix via Octokit Contents API (FIX-03)

**What:** Commit a validated fix to the PR branch using the GitHub Contents API.
**When to use:** After fix passes all validation checks.

```typescript
// lib/fix/commit.ts
// Source: https://docs.github.com/en/rest/repos/contents

async function commitFixToGitHub(
  octokit: Octokit,
  params: {
    owner: string;
    repo: string;
    branch: string;
    filePath: string;
    content: string;
    finding: Finding;
  }
): Promise<string> {
  // 1. Get current file SHA (required for updates)
  const { data: currentFile } = await octokit.repos.getContent({
    owner: params.owner,
    repo: params.repo,
    path: params.filePath,
    ref: params.branch,
  });

  // getContent returns array for directories, object for files
  if (Array.isArray(currentFile)) {
    throw new Error(`Path ${params.filePath} is a directory, not a file`);
  }

  // 2. Commit the fix
  const { data: commitResult } = await octokit.repos.createOrUpdateFileContents({
    owner: params.owner,
    repo: params.repo,
    path: params.filePath,
    message: `fix(security): ${params.finding.type} (${params.finding.cweId})\n\nAuto-fix applied by ClawGuard for ${params.finding.severity} finding.\nLocation: ${params.filePath}:${params.finding.location.line}`,
    content: Buffer.from(params.content).toString("base64"),
    sha: currentFile.sha,
    branch: params.branch,
  });

  return commitResult.commit.sha;
}
```

### Pattern 5: JSX Summary Card with Actions (CARD-04)

**What:** Convert summary card from raw Markdown string to Chat SDK JSX Card with action labels and LinkButton.
**When to use:** Posting audit results to the PR thread.

**CRITICAL: GitHub Rendering Behavior (verified from source code)**

The `@chat-adapter/github` adapter renders card components as follows (verified by reading `node_modules/@chat-adapter/github/dist/index.js` lines 87-94):

| Component | GitHub Rendering | Clickable? |
|-----------|-----------------|------------|
| `Button` | `**[Label]**` (bold text in brackets) | NO |
| `LinkButton` | `[Label](url)` (markdown link) | YES |
| `Card` title | `## Title` (heading) | N/A |
| `CardText` | Plain text / markdown | N/A |
| `Fields/Field` | `**Label:** Value` | N/A |
| `Divider` | `---` | N/A |

**Implication:** `Button` components with `onAction` handlers will NOT be interactive on GitHub. They render as visible but non-clickable bold text. Use `LinkButton` for clickable actions (View Report) and text instructions for fix commands.

```tsx
// lib/cards/summary-card.tsx
/** @jsxImportSource chat */
import {
  Card, CardText, Actions, Button, LinkButton,
  Fields, Field, Divider, Table,
} from "chat";
import type { AuditResult, Finding } from "@/lib/analysis/types";

export function buildSummaryCard(
  audit: AuditResult,
  pr: { owner: string; repo: string; number: number }
) {
  const counts = audit.severityCounts;
  const fixableCount = audit.allFindings.filter(
    (f) => ["CRITICAL", "HIGH"].includes(f.severity)
  ).length;

  const topFindings = audit.allFindings
    .filter((f) => ["CRITICAL", "HIGH", "MEDIUM"].includes(f.severity))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99))
    .slice(0, 5);

  return (
    <Card title={`ClawGuard Security Audit: ${audit.score}/100 (${audit.grade})`}>
      <Fields>
        <Field label="CRITICAL" value={String(counts.CRITICAL ?? 0)} />
        <Field label="HIGH" value={String(counts.HIGH ?? 0)} />
        <Field label="MEDIUM" value={String(counts.MEDIUM ?? 0)} />
        <Field label="LOW" value={String(counts.LOW ?? 0)} />
      </Fields>
      {topFindings.length > 0 && (
        <Table
          headers={["Severity", "Finding", "Location"]}
          rows={topFindings.map((f) => [
            `${severityEmoji(f.severity)} ${f.severity}`,
            f.type,
            `${f.location.file}:${f.location.line}`,
          ])}
        />
      )}
      <Divider />
      {fixableCount > 0 && (
        <CardText>
          {`Reply \`@clawguard fix all\` to auto-fix ${fixableCount} CRITICAL+HIGH findings, or \`@clawguard fix <type>\` for a specific finding.`}
        </CardText>
      )}
      <Actions>
        <Button id="fix-all" style="primary">Fix All ({fixableCount})</Button>
        <LinkButton url={`/report/${pr.owner}/${pr.repo}/${pr.number}`}>
          View Report
        </LinkButton>
      </Actions>
    </Card>
  );
}
```

On GitHub, this renders as GFM Markdown similar to:
```markdown
## ClawGuard Security Audit: 45/100 (F)

**CRITICAL:** 2 | **HIGH:** 3 | **MEDIUM:** 1 | **LOW:** 0

| Severity | Finding | Location |
|----------|---------|----------|
| CRITICAL | sql-injection | users.ts:42 |
| ...      | ...     | ...      |

---

Reply `@clawguard fix all` to auto-fix 5 CRITICAL+HIGH findings, or `@clawguard fix <type>` for a specific finding.

**[Fix All (5)]** . [View Report](/report/owner/repo/1)
```

### Pattern 6: Intent Detection for Text Commands (D-03)

**What:** Parse `@clawguard` mentions in subscribed threads to detect fix commands.
**When to use:** In `bot.onSubscribedMessage` handler.

```typescript
// In lib/bot.ts
type Intent =
  | { type: "fix-all" }
  | { type: "fix-finding"; target: string }
  | { type: "re-audit" }
  | { type: "unknown" };

function detectIntent(body: string, botName: string): Intent {
  const lower = body.toLowerCase();
  const mention = `@${botName.toLowerCase()}`;

  if (!lower.includes(mention)) return { type: "unknown" };

  const afterMention = lower.split(mention).pop()?.trim() ?? "";

  if (afterMention.startsWith("fix all")) {
    return { type: "fix-all" };
  }

  const fixMatch = afterMention.match(/^fix\s+(.+)/);
  if (fixMatch) {
    return { type: "fix-finding", target: fixMatch[1].trim() };
  }

  if (afterMention.startsWith("audit") || afterMention.startsWith("scan") || afterMention.startsWith("review")) {
    return { type: "re-audit" };
  }

  return { type: "unknown" };
}
```

### Pattern 7: Sandbox Lifecycle for Fixes (Claude's Discretion)

**Recommendation:** Reuse a single sandbox across all fixes in a "Fix All" operation. Creating a fresh sandbox per fix adds ~5-10 seconds overhead each time.

```typescript
async function fixAll(
  findings: Finding[],
  context: FixContext
): Promise<FixResult[]> {
  const fixable = findings.filter((f) =>
    ["CRITICAL", "HIGH"].includes(f.severity)
  );

  // Single sandbox for all fixes
  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: `https://github.com/${context.owner}/${context.repo}`,
      username: "x-access-token",
      password: process.env.GITHUB_TOKEN!,
      depth: 50,
    },
    timeout: 10 * 60 * 1000,
  });

  try {
    await sandbox.runCommand("git", ["fetch", "origin", context.prBranch]);
    await sandbox.runCommand("git", ["checkout", context.prBranch]);

    // Install deps for validation
    await sandbox.runCommand("npm", ["install", "--ignore-scripts"]);

    const results: FixResult[] = [];
    for (const finding of fixable) {
      const result = await fixFinding(sandbox, finding, context);
      results.push(result);

      // If fix was committed, pull it in sandbox to keep it in sync
      if (result.status === "fixed") {
        await sandbox.runCommand("git", ["pull", "origin", context.prBranch]);
      }
    }

    return results;
  } finally {
    await sandbox.stop();
  }
}
```

### Anti-Patterns to Avoid

- **Committing without validation:** Never commit a fix that hasn't passed all detected validation tools. This is the core credibility claim.
- **Modifying files via `git push` from sandbox:** The sandbox has no push credentials. Always use the Octokit Contents API from the Next.js server.
- **Parallel fix commits:** The GitHub Contents API uses file SHAs for optimistic concurrency. Parallel commits to different files on the same branch can cause SHA conflicts on fast-forward. Process sequentially.
- **Applying `fix.before`/`fix.after` with naive string replace when the code has been modified:** The `fix.before` snippet may not exactly match if the file was formatted differently. Use a tolerant matching strategy or fall to agent tier.
- **Keeping sandbox running during commit:** The commit happens via Octokit (server-side), not in the sandbox. Don't hold the sandbox open while waiting for GitHub API responses.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git file commits | Shell out to `git push` | Octokit `repos.createOrUpdateFileContents()` | No push credentials in sandbox; Octokit handles auth, SHA tracking, atomic commits |
| Base64 encoding | Custom encoding | `Buffer.from(content).toString("base64")` | Node.js built-in, handles all edge cases |
| File SHA retrieval | Parse git objects | Octokit `repos.getContent()` | Returns file SHA directly in response |
| Validation tool detection | Hardcode tool paths | Check for config files (`tsconfig.json`, `eslint.config.*`, `biome.json`) | Each repo has different tooling; detection adapts |
| Fix generation fallback | Custom prompt engineering framework | AI SDK `ToolLoopAgent` with `Output.object` | Already proven in phase2-vuln.ts; handles retries, structured output, tool calling |

**Key insight:** The Octokit Contents API is the only viable way to commit from a serverless environment. The sandbox cannot push to GitHub (no persistent SSH keys or tokens configured for git push), and the Contents API provides atomic, authenticated commits with proper SHA-based conflict detection.

## Common Pitfalls

### Pitfall 1: GitHub Action Buttons Do Not Work

**What goes wrong:** Developers wire `bot.onAction("fix-all", handler)` and expect it to fire when users click buttons in GitHub PR comments. Nothing happens.
**Why it happens:** The `@chat-adapter/github` adapter renders `Button` components as `**[Label]**` (bold text) in GFM Markdown. There is no mechanism for GitHub to send an action event back to the webhook when text is "clicked."
**How to avoid:** Use text commands (`@clawguard fix all`) as the primary trigger mechanism. Use `Button` components only as visual labels indicating available commands. Use `LinkButton` for navigation (View Report). Wire `onAction` only for future platform support (Slack, Discord).
**Warning signs:** Testing only with manual API calls; not testing the full GitHub comment flow.

### Pitfall 2: File SHA Conflicts on Sequential Commits

**What goes wrong:** After committing fix #1 to `users.ts`, committing fix #2 to `users.ts` fails with 409 Conflict because the SHA changed.
**Why it happens:** `createOrUpdateFileContents` requires the current SHA of the file being replaced. After commit #1, the SHA changes. If you cached the SHA before starting fixes, it's stale.
**How to avoid:** Always fetch the current SHA immediately before each commit via `repos.getContent()`. Never cache SHAs across multiple commit operations.
**Warning signs:** 409 responses from GitHub API; fix commits silently failing.

### Pitfall 3: fix.before String Matching Fails

**What goes wrong:** `originalContent.replace(finding.fix.before, finding.fix.after)` returns the original content unchanged because `fix.before` doesn't exactly match the file content.
**Why it happens:** The AI generated `fix.before` may differ from the actual file content in whitespace, indentation, trailing newlines, or line endings. The AI sees a diff, not the raw file.
**How to avoid:** Use normalized comparison (trim whitespace, normalize line endings). If exact match fails, try fuzzy matching or fall through to the agent tier. Always verify the replace actually changed something before validating.
**Warning signs:** Fast-path always falling through to agent tier; validation passing on unchanged files.

### Pitfall 4: Sandbox Timeout During Fix All

**What goes wrong:** Processing 5+ findings sequentially in "Fix All" takes longer than the sandbox timeout (default 5 min).
**Why it happens:** Each fix involves: file read, write, validation (tsc + eslint + tests), possible agent fallback (multiple LLM calls). For a repo with a large test suite, this adds up.
**How to avoid:** Set sandbox timeout to 10 minutes (`timeout: 10 * 60 * 1000`). Use `sandbox.extendTimeout()` if approaching limit. Skip test suite for individual fixes and only run full tests after all fixes are applied. Monitor `sandbox.timeout` between fixes.
**Warning signs:** Sandbox status becoming "failed" mid-fix; partial fix results.

### Pitfall 5: Webhook Timeout (maxDuration) for Fix + Re-Audit

**What goes wrong:** The 300-second `maxDuration` on the webhook route is not enough for Fix All (fixing 5 findings) + full re-audit (3 ToolLoopAgent phases).
**Why it happens:** Fix All with agent fallbacks can take 3-5 minutes. Re-audit takes another 2-5 minutes. Combined: 5-10 minutes exceeds 300s.
**How to avoid:** The webhook route already uses `after()` / `waitUntil` for background processing. Ensure the fix + re-audit pipeline runs entirely in the background task. Consider splitting: fix in one background task, then trigger re-audit as a separate operation. On Vercel Pro, `maxDuration` can be set to 900s.
**Warning signs:** 504 Gateway Timeout errors; partial fix completion.

### Pitfall 6: JSX Import Source Configuration

**What goes wrong:** TypeScript compilation errors when using JSX in `.tsx` files with Chat SDK Card components: "Cannot find module 'chat/jsx-runtime'."
**Why it happens:** The default `jsxImportSource` in `tsconfig.json` is not set to `"chat"`. The current config has `"jsx": "react-jsx"` which uses React's JSX runtime.
**How to avoid:** Use per-file pragma `/** @jsxImportSource chat */` at the top of card files instead of changing the global tsconfig (which would break React components). Only card files need the chat JSX runtime.
**Warning signs:** TypeScript errors in card files; JSX elements not rendering as Chat SDK cards.

### Pitfall 7: Contents API File Size Limit

**What goes wrong:** `createOrUpdateFileContents` fails for files larger than 1 MB.
**Why it happens:** GitHub's Contents API has a 1 MB limit for the full endpoint. Files 1-100 MB require raw/object media types.
**How to avoid:** Check file size before committing. For files > 1 MB, use the Git Data API (create blob, create tree, create commit) instead. In practice, source code files rarely exceed 1 MB, so this is unlikely but should be handled with a clear error message.
**Warning signs:** 422 Validation Failed errors from GitHub API.

## Code Examples

### Octokit: Get File Content + SHA

```typescript
// Source: https://docs.github.com/en/rest/repos/contents
const { data } = await octokit.repos.getContent({
  owner: "owner",
  repo: "repo",
  path: "src/users.ts",
  ref: "feature-branch",  // Important: specify the PR branch
});

// data.sha is the blob SHA needed for createOrUpdateFileContents
// data.content is Base64-encoded file content (for files < 1MB)
if (!Array.isArray(data) && data.type === "file") {
  const sha = data.sha;
  const content = Buffer.from(data.content, "base64").toString("utf-8");
}
```

### Octokit: Commit Fix to PR Branch

```typescript
// Source: https://docs.github.com/en/rest/repos/contents
const { data: result } = await octokit.repos.createOrUpdateFileContents({
  owner: "owner",
  repo: "repo",
  path: "src/users.ts",
  message: "fix(security): sql-injection (CWE-89)\n\nAuto-fix by ClawGuard",
  content: Buffer.from(fixedFileContent).toString("base64"),
  sha: currentFileSha,       // From getContent response
  branch: "feature-branch",  // PR head branch
  committer: {
    name: "ClawGuard Bot",
    email: "clawguard[bot]@users.noreply.github.com",
  },
});

const commitSha = result.commit.sha;  // The new commit SHA
```

### Sandbox: Write File and Run Validation

```typescript
// Source: https://vercel.com/docs/vercel-sandbox/sdk-reference
// Write the fixed file
await sandbox.writeFiles([
  { path: "src/users.ts", content: Buffer.from(fixedContent) },
]);

// Run TypeScript check
const tscResult = await sandbox.runCommand("npx", ["tsc", "--noEmit"]);
if (tscResult.exitCode !== 0) {
  const errors = await tscResult.stderr();
  console.log("TypeScript errors:", errors);
}

// Read file back for committing
const buffer = await sandbox.readFileToBuffer({ path: "src/users.ts" });
const contentForCommit = buffer?.toString("utf-8") ?? "";
```

### Chat SDK: onAction Handler (Future Platform Support)

```typescript
// Source: https://chat-sdk.dev/docs/actions
// This handler won't fire on GitHub but will work on Slack/Discord
bot.onAction("fix-all", async (event) => {
  // event.thread, event.value, event.user available
  const thread = event.thread;
  if (!thread) return;

  await thread.post("Starting auto-fix for all CRITICAL + HIGH findings...");
  // Trigger fix pipeline...
});
```

### ToolLoopAgent: Fallback Fix Generation

```typescript
// Modeled after lib/analysis/phase2-vuln.ts
import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";

const FixResultSchema = z.object({
  fixedCode: z.string().describe("The complete fixed file content"),
  explanation: z.string().describe("What was changed and why"),
});

const fixAgent = new ToolLoopAgent({
  model: gateway("anthropic/claude-sonnet-4.6"),
  tools,  // bash tools from createBashTool({ sandbox })
  output: Output.object({ schema: FixResultSchema }),
  stopWhen: stepCountIs(15),
  instructions: [
    "You are a security engineer fixing a vulnerability.",
    `Finding: ${finding.type} (${finding.cweId})`,
    `File: ${finding.location.file}:${finding.location.line}`,
    `Description: ${finding.description}`,
    `Previous fix attempt failed validation: ${validationErrors}`,
    "",
    "Read the full file, understand the context, and generate a fix.",
    "The fix must:",
    "- Address the specific vulnerability without changing unrelated code",
    "- Maintain the existing code style and indentation",
    "- Not introduce new vulnerabilities",
    "- Pass type checking and linting",
    "",
    "Return the complete fixed file content.",
  ].join("\n"),
});

const result = await fixAgent.generate({
  prompt: `Fix the ${finding.type} vulnerability in ${finding.location.file}`,
});
```

## Discretion Recommendations

### Commit Message Format

**Recommendation:** One commit per fix, with a structured commit message referencing the finding.

```
fix(security): <type> (<CWE-ID>)

Auto-fix applied by ClawGuard for <SEVERITY> finding.
Location: <file>:<line>
```

Example:
```
fix(security): sql-injection (CWE-89)

Auto-fix applied by ClawGuard for CRITICAL finding.
Location: src/routes/users.ts:42
```

**Rationale:** One commit per fix provides clear git history, easy revert of individual fixes, and each commit can be traced to a specific finding. The commit message format follows conventional commits pattern.

### Fix Confirmation Message Format

**Recommendation:** Post a brief inline confirmation after each fix, then a summary after all fixes.

Per-fix confirmation:
```
Fixed: sql-injection (CWE-89) in `src/users.ts:42` -- commit abc1234
```

Final summary (after Fix All + re-audit):
```
## Auto-Fix Results

| Finding | Status | Commit |
|---------|--------|--------|
| sql-injection (CWE-89) | Fixed | abc1234 |
| hardcoded-secret (CWE-798) | Fixed | def5678 |
| missing-rate-limit (CWE-770) | Skipped | -- |

Re-audit complete. New score: 85/100 (B). See updated card above.
```

### Sandbox Lifecycle

**Recommendation:** Single sandbox for all fixes in a "Fix All" operation. After all fixes are committed, stop the fix sandbox and create a NEW sandbox for re-audit (to ensure fresh clone with all committed fixes).

**Rationale:** Reusing sandbox for fixes avoids 5-10s creation overhead per fix. Creating a new sandbox for re-audit ensures the audit sees the committed code, not just local changes. This matches the established pattern in `pipeline.ts`.

### Re-Audit Integration

**Recommendation:** After all fixes are committed, call the existing `reviewPullRequest()` function with the same PR parameters. This runs the full 3-phase pipeline on the updated code. Store the new result in Redis (overwriting the previous audit), and post a new summary card.

```typescript
// After all fixes committed:
const newAuditResult = await reviewPullRequest(
  { owner, repo, prBranch, baseBranch },
  onProgress
);

await storeAuditResult({
  key: `${owner}/${repo}/pr/${prNumber}`,
  data: {
    result: newAuditResult,
    timestamp: new Date().toISOString(),
    pr: { owner, repo, number: prNumber, title: prTitle },
    status: "complete",
  },
});

const newCard = buildSummaryCard(newAuditResult, { owner, repo, number: prNumber });
await thread.post(newCard);
```

### Validation Tool Auto-Detection

**Recommendation:** Use file-existence checks in the sandbox to detect available tools. Order: TypeScript check (most common), then linter (ESLint or Biome), then test suite. Install dependencies (`npm install --ignore-scripts`) before running validation.

Detection priority:
1. `tsconfig.json` exists -> run `npx tsc --noEmit`
2. `eslint.config.*` or `.eslintrc.*` exists -> run `npx eslint --no-warn-ignored .` on the changed file
3. `biome.json` exists -> run `npx biome check .` on the changed file
4. `package.json` has non-stub `test` script -> run `npm test`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Git Data API (blob+tree+commit) | Contents API for single-file commits | Stable since 2020 | Contents API is simpler for single-file changes; Git Data API needed only for multi-file atomic commits |
| Octokit v20 `repos.createOrUpdateFileContents` | Octokit v22 -- same API surface | 2025 | No API change, just package version bump |
| AI SDK `generateText` with manual tool loop | `ToolLoopAgent` class | AI SDK 6.x | Agent abstraction handles loop, context, stopping conditions automatically |

## Open Questions

1. **Multi-file fixes**
   - What we know: The Contents API commits one file at a time. Some vulnerabilities may require fixing multiple files simultaneously (e.g., adding a middleware AND updating the route).
   - What's unclear: Whether the stored `fix.before`/`fix.after` can span multiple files. The current `Finding` schema has a single `location.file`.
   - Recommendation: For v1/hackathon, restrict fixes to single-file changes. If a finding's fix spans multiple files, skip it and report. Multi-file atomic commits via Git Data API can be added in v2.

2. **Rate limiting on Contents API**
   - What we know: GitHub's REST API has rate limits (5000 requests/hour for authenticated apps). Each fix commit requires 2 API calls (getContent + createOrUpdateFileContents).
   - What's unclear: Whether "Fix All" with 10+ findings could approach rate limits when combined with other API calls.
   - Recommendation: For hackathon scale (few PRs), this is not a concern. Add retry with exponential backoff for 429 responses as defensive measure.

3. **Sandbox npm install time**
   - What we know: `npm install` in the sandbox can take 30-60 seconds for large projects.
   - What's unclear: Whether to install deps every time or if the cloned repo already has them.
   - Recommendation: Git clone does NOT include `node_modules`. Run `npm install --ignore-scripts` once at sandbox creation. Consider using snapshots for repeated operations on the same repo.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIX-01 | Fix generation in sandbox (fast path + agent fallback) | unit | `npx vitest run tests/fix/apply.test.ts -t "apply" --reporter=verbose` | Wave 0 |
| FIX-02 | Validation detection and execution | unit | `npx vitest run tests/fix/validate.test.ts --reporter=verbose` | Wave 0 |
| FIX-03 | Commit via Octokit Contents API | unit | `npx vitest run tests/fix/commit.test.ts --reporter=verbose` | Wave 0 |
| FIX-04 | Fix confirmation message posted | unit | `npx vitest run tests/bot.test.ts -t "fix confirmation" --reporter=verbose` | Wave 0 |
| FIX-05 | Fix All processes CRITICAL+HIGH sequentially | unit | `npx vitest run tests/fix/index.test.ts -t "fix all" --reporter=verbose` | Wave 0 |
| FIX-06 | Re-audit runs after fixes | unit | `npx vitest run tests/fix/index.test.ts -t "re-audit" --reporter=verbose` | Wave 0 |
| FIX-07 | New summary card with updated score | unit | `npx vitest run tests/cards/summary-card.test.ts --reporter=verbose` | Existing (update) |
| CARD-04 | JSX Card with action buttons/labels | unit | `npx vitest run tests/cards/summary-card.test.ts -t "action" --reporter=verbose` | Existing (update) |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/fix/apply.test.ts` -- covers FIX-01 (fix application, fast path, string matching)
- [ ] `tests/fix/validate.test.ts` -- covers FIX-02 (validation tool detection, pass/fail scenarios)
- [ ] `tests/fix/commit.test.ts` -- covers FIX-03 (Octokit calls, SHA handling, commit message format)
- [ ] `tests/fix/index.test.ts` -- covers FIX-05, FIX-06 (fixAll orchestration, re-audit trigger)
- [ ] Update `tests/cards/summary-card.test.ts` -- covers CARD-04 (JSX card output, action buttons, LinkButton)
- [ ] Update `tests/bot.test.ts` -- covers FIX-04 (intent detection, fix confirmation, onAction handler)

Note: Tests follow the existing pattern in this project of source code analysis (`readFileSync`) to verify structure without triggering Chat SDK initialization side effects.

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Next.js App Router, Vercel AI SDK, Chat SDK GitHub adapter, Vercel Sandbox, @octokit/rest, Upstash Redis -- all already installed
- **AI provider:** Vercel AI Gateway via `gateway("anthropic/claude-sonnet-4.6")` -- not direct Anthropic API
- **Deployment:** Single Next.js app on Vercel -- no separate backend services
- **Architecture:** Everything colocated -- webhook handler, API routes, report pages
- **Design:** Dark theme, professional/dense enterprise aesthetic
- **Conventions:** Named exports, no barrel files, direct imports; path alias `@/*`; try/catch with generic error messages; `maxDuration = 300` on webhook route
- **Testing:** Vitest with source code analysis pattern (readFileSync) to avoid SDK initialization side effects
- **Redis:** Two clients -- `@upstash/redis` (HTTP REST) for audit data, `redis@5` (TCP) for Chat SDK state -- different connection strings
- **Zod:** v4.x with AI SDK structured output
- **Sandbox:** Requires OIDC token; runs in iad1 (US East); `depth: 50` for git clone
- **GSD Workflow:** All code changes must go through GSD commands

## Sources

### Primary (HIGH confidence)
- `@chat-adapter/github/dist/index.js` lines 87-94 -- Verified exact rendering of Button vs LinkButton on GitHub
- https://docs.github.com/en/rest/repos/contents -- Octokit Contents API parameters, SHA requirements, file size limits
- https://vercel.com/docs/vercel-sandbox/sdk-reference -- Sandbox.create, writeFiles, readFileToBuffer, runCommand API
- https://chat-sdk.dev/docs/actions -- onAction handler registration, ActionEvent payload
- https://chat-sdk.dev/docs/cards -- JSX Card components, jsxImportSource configuration
- https://chat-sdk.dev/docs/adapters/github -- GitHub adapter limitations: Buttons No, Card format GFM Markdown

### Secondary (MEDIUM confidence)
- https://ai-sdk.dev/docs/foundations/agents -- ToolLoopAgent creation, generate method, structured output
- Existing codebase patterns: `lib/analysis/pipeline.ts`, `lib/analysis/phase2-vuln.ts`, `lib/bot.ts`

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources or source code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and verified in package.json
- Architecture: HIGH -- patterns derived from existing codebase code and verified API docs
- GitHub button limitation: HIGH -- verified by reading adapter source code directly
- Octokit Contents API: HIGH -- verified against official GitHub REST docs
- Sandbox API: HIGH -- verified against official Vercel SDK reference
- Pitfalls: HIGH -- derived from API constraints (SHA conflicts, button rendering, timeouts) verified in docs

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (30 days -- stable APIs, no fast-moving dependencies)
