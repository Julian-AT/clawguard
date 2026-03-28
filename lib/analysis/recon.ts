import type { Sandbox } from "@vercel/sandbox";
import type { ReconResult } from "./types";

const MAX_EXCERPT_LINES = 120;
const MAX_EXCERPT_CHARS = 48_000;

/**
 * Parse `git diff` output for changed file paths (new or modified).
 */
export function parseChangedFilesFromDiff(diff: string): string[] {
  const paths = new Set<string>();
  const re = /^diff --git a\/(.+?) b\/(.+?)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(diff)) !== null) {
    const p = m[2] ?? m[1];
    if (p && !p.endsWith("/dev/null")) paths.add(p);
  }
  return [...paths];
}

/**
 * Non-LLM reconnaissance: diff stats, file excerpts, lightweight static signals.
 */
export async function runReconnaissance(
  sandbox: Sandbox,
  diff: string
): Promise<ReconResult> {
  const changedFiles = parseChangedFilesFromDiff(diff).map((path) => ({ path }));

  const languages = new Set<string>();
  for (const { path } of changedFiles) {
    if (/\.tsx?$/i.test(path)) languages.add("TypeScript");
    else if (/\.jsx?$/i.test(path)) languages.add("JavaScript");
    else if (/\.py$/i.test(path)) languages.add("Python");
    else if (/\.go$/i.test(path)) languages.add("Go");
    else if (/\.rs$/i.test(path)) languages.add("Rust");
  }

  let packageManager: string | undefined;
  const pkgCheck = await sandbox.runCommand("test", ["-f", "package.json"]);
  if (pkgCheck.exitCode === 0) {
    packageManager = "npm";
    const pnpm = await sandbox.runCommand("test", ["-f", "pnpm-lock.yaml"]);
    if (pnpm.exitCode === 0) packageManager = "pnpm";
    const yarn = await sandbox.runCommand("test", ["-f", "yarn.lock"]);
    if (yarn.exitCode === 0) packageManager = "yarn";
  }

  const frameworkHints: string[] = [];
  if (packageManager) {
    try {
      const cat = await sandbox.runCommand("cat", ["package.json"]);
      if (cat.exitCode === 0) {
        const raw = await cat.stdout();
        const pkg = JSON.parse(raw) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const deps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };
        if (deps.next) frameworkHints.push("Next.js");
        if (deps.react) frameworkHints.push("React");
        if (deps.express) frameworkHints.push("Express");
        if (deps["@nestjs/core"]) frameworkHints.push("NestJS");
      }
    } catch {
      // ignore
    }
  }

  const fileExcerpts: Record<string, string> = {};
  for (const { path } of changedFiles.slice(0, 40)) {
    try {
      const buf = await sandbox.readFileToBuffer({ path });
      if (!buf) continue;
      const text = buf.toString("utf-8");
      const lines = text.split("\n");
      const excerpt = lines.slice(0, MAX_EXCERPT_LINES).join("\n");
      fileExcerpts[path] =
        excerpt.length > MAX_EXCERPT_CHARS
          ? `${excerpt.slice(0, MAX_EXCERPT_CHARS)}\n/* … truncated … */`
          : excerpt;
    } catch {
      // unreadable binary or missing
    }
  }

  let staticAnalysisSnippet = "";
  const tsc = await sandbox.runCommand("test", ["-f", "tsconfig.json"]);
  if (tsc.exitCode === 0) {
    const run = await sandbox.runCommand("npx", [
      "tsc",
      "--noEmit",
      "--pretty",
      "false",
    ]);
    if (run.exitCode !== 0) {
      const err = await run.stderr();
      staticAnalysisSnippet = `tsc --noEmit (exit ${run.exitCode}):\n${err.slice(0, 4000)}`;
    } else {
      staticAnalysisSnippet = "tsc --noEmit: OK";
    }
  }

  const linesChanged = (diff.match(/^[-+]/gm) ?? []).length;

  let dependencyAuditSnippet: string | undefined;
  if (pkgCheck.exitCode === 0) {
    const audit = await sandbox.runCommand("npm", [
      "audit",
      "--json",
      "--package-lock-only",
    ]);
    const out = await audit.stdout();
    if (out) {
      dependencyAuditSnippet = out.slice(0, 12_000);
    }
  }

  const secretPatternHints = secretHintsFromDiff(diff);

  let optionalSarifSnippet: string | undefined;
  try {
    const sarifBuf = await sandbox.readFileToBuffer({
      path: ".clawguard/semgrep.sarif",
    });
    if (sarifBuf) {
      optionalSarifSnippet = sarifBuf.toString("utf-8").slice(0, 16_000);
    }
  } catch {
    // optional file
  }

  return {
    changedFiles,
    languages: [...languages],
    packageManager,
    frameworkHints,
    staticAnalysisSnippet: staticAnalysisSnippet || undefined,
    diff:
      diff.length > 200_000
        ? `${diff.slice(0, 200_000)}\n\n/* … diff truncated … */`
        : diff,
    fileExcerpts:
      Object.keys(fileExcerpts).length > 0 ? fileExcerpts : undefined,
    linesChanged,
    dependencyAuditSnippet,
    secretPatternHints:
      secretPatternHints.length > 0 ? secretPatternHints : undefined,
    optionalSarifSnippet,
  };
}

function secretHintsFromDiff(diff: string): string[] {
  const hints: string[] = [];
  const checks: Array<{ label: string; re: RegExp }> = [
    { label: "Possible live Stripe key", re: /sk_live_[a-z0-9]{20,}/i },
    { label: "Possible AWS access key id", re: /AKIA[0-9A-Z]{16}/ },
    {
      label: "Assignment of secret-like value",
      re: /(?:api[_-]?key|secret|password|token)\s*[=:]\s*['"][^'"\s]{12,}['"]/i,
    },
    { label: "Private key block", re: /-----BEGIN [A-Z ]+PRIVATE KEY-----/ },
  ];
  for (const { label, re } of checks) {
    if (re.test(diff)) hints.push(label);
  }
  return [...new Set(hints)].slice(0, 8);
}
