import type { Sandbox } from "@vercel/sandbox";
import { tool } from "ai";
import { z } from "zod";
import type { AgentContext } from "@/lib/agents/types";
import { parseUnifiedDiff } from "@/lib/analysis/parse-diff";
import { appendLearningRepo, listLearningsOrg, listLearningsRepo } from "@/lib/learnings";
import type { LearningAction } from "@/lib/learnings/types";
import { osvQueryBatch } from "@/lib/osv/client";
import { analyzeSourceCode } from "@/lib/tree-sitter/analyze";
import { buildDepGraphFromImports, extractImportSpecifiers } from "./dep-graph";
import { mermaidDependencyGraph, mermaidSequenceFromSteps } from "./generate-diagram";
import { scanDiffForSecrets } from "./secret-scan-lib";

/**
 * Custom AI SDK tools for ClawGuard agents (merge with createBashTool().tools).
 */
export function buildClawAgentTools(sandbox: Sandbox, ctx: AgentContext) {
  const parse_diff = tool({
    description:
      "Parse a unified git diff into structured files and hunks with additions, deletions, and context.",
    inputSchema: z.object({
      diff: z.string().describe("Raw unified diff text"),
    }),
    execute: async ({ diff }) => {
      const parsed = parseUnifiedDiff(diff);
      return { ok: true as const, ...parsed };
    },
  });

  const ast_analyze = tool({
    description:
      "Run tree-sitter AST analysis: functions with cyclomatic complexity, nesting depth, parameter counts, and call edges.",
    inputSchema: z.object({
      filePath: z.string().describe("Repo-relative path"),
      source: z.string().describe("Full file source code"),
    }),
    execute: async ({ filePath, source }) => {
      const result = await analyzeSourceCode(filePath, source);
      return { ok: true as const, result };
    },
  });

  const semgrep_scan = tool({
    description:
      "Run semgrep with --config=auto on given paths in the sandbox (requires semgrep/npx). Returns JSON output or error.",
    inputSchema: z.object({
      paths: z.array(z.string()).describe("Paths relative to repo root"),
    }),
    execute: async ({ paths }) => {
      try {
        const run = await sandbox.runCommand("npx", [
          "-y",
          "semgrep@latest",
          "scan",
          "--config=auto",
          "--json",
          "--quiet",
          ...paths.slice(0, 40),
        ]);
        const out = await run.stdout();
        const err = await run.stderr();
        return {
          ok: run.exitCode === 0,
          exitCode: run.exitCode,
          stdout: out.slice(0, 120_000),
          stderr: err.slice(0, 8000),
        };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    },
  });

  const osv_lookup = tool({
    description:
      "Batch query OSV (api.osv.dev) for known CVEs affecting package name + version + ecosystem (npm, PyPI, etc.).",
    inputSchema: z.object({
      packages: z.array(
        z.object({
          name: z.string(),
          version: z.string(),
          ecosystem: z.string().describe('e.g. "npm", "PyPI", "RubyGems"'),
        }),
      ),
    }),
    execute: async ({ packages }) => {
      const batch = await osvQueryBatch(packages.slice(0, 100));
      return { ok: true as const, batch };
    },
  });

  const secret_scan = tool({
    description:
      "Scan a unified diff for high-entropy strings and known secret patterns (AWS, GitHub, Stripe, etc.).",
    inputSchema: z.object({
      diff: z.string(),
    }),
    execute: async ({ diff }) => {
      const hits = scanDiffForSecrets(diff);
      return { ok: true as const, hits, count: hits.length };
    },
  });

  const dependency_graph = tool({
    description:
      "Build an import dependency graph from file contents (extracts import/from and require()).",
    inputSchema: z.object({
      files: z.array(
        z.object({
          path: z.string(),
          source: z.string(),
        }),
      ),
    }),
    execute: async ({ files }) => {
      const mapped = files.map((f) => ({
        path: f.path,
        importSpecs: extractImportSpecifiers(f.source),
      }));
      const graph = buildDepGraphFromImports(mapped);
      return { ok: true as const, graph };
    },
  });

  const generate_diagram = tool({
    description:
      "Generate Mermaid source: dependency graph from dep-graph tool output, or sequence diagram from steps.",
    inputSchema: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("dependency"),
        graph: z.any().describe("Output of dependency_graph.graph"),
        title: z.string().optional(),
      }),
      z.object({
        kind: z.literal("sequence"),
        participants: z.array(z.string()),
        steps: z.array(
          z.object({
            from: z.string(),
            to: z.string(),
            label: z.string(),
          }),
        ),
      }),
    ]),
    execute: async (input) => {
      if (input.kind === "dependency") {
        const mermaid = mermaidDependencyGraph(input.graph, input.title);
        return { ok: true as const, mermaid };
      }
      const mermaid = mermaidSequenceFromSteps(input.participants, input.steps);
      return { ok: true as const, mermaid };
    },
  });

  const memory_recall = tool({
    description: "Load org + repo learnings from Redis for suppression and pattern matching.",
    inputSchema: z.object({
      patternFilter: z.string().optional().describe("Substring filter on pattern field"),
    }),
    execute: async ({ patternFilter }) => {
      const owner = ctx.owner;
      const repo = ctx.repo;
      if (!owner || !repo) {
        return { ok: false, error: "owner/repo not set on agent context" };
      }
      let repoL = await listLearningsRepo(owner, repo);
      let orgL = await listLearningsOrg(owner);
      if (patternFilter) {
        const pf = patternFilter.toLowerCase();
        repoL = repoL.filter((l) => l.pattern.toLowerCase().includes(pf));
        orgL = orgL.filter((l) => l.pattern.toLowerCase().includes(pf));
      }
      return { ok: true as const, repo: repoL.slice(0, 80), org: orgL.slice(0, 80) };
    },
  });

  const memory_store = tool({
    description:
      "Append a learning (suppress/prefer/escalate) for this repository. Requires owner/repo on context.",
    inputSchema: z.object({
      pattern: z.string(),
      context: z.string(),
      action: z.enum(["prefer", "suppress", "escalate"]),
      confidence: z.number().min(0).max(1),
    }),
    execute: async ({ pattern, context: ctxText, action, confidence }) => {
      const owner = ctx.owner;
      const repo = ctx.repo;
      if (!owner || !repo) {
        return { ok: false, error: "owner/repo not set on agent context" };
      }
      const row = await appendLearningRepo(owner, repo, {
        pattern,
        context: ctxText,
        action: action as LearningAction,
        confidence,
      });
      return { ok: true as const, learning: row };
    },
  });

  return {
    parse_diff,
    ast_analyze,
    semgrep_scan,
    osv_lookup,
    secret_scan,
    dependency_graph,
    generate_diagram,
    memory_recall,
    memory_store,
  };
}

export type ClawAgentToolSet = ReturnType<typeof buildClawAgentTools>;
