import type { Sandbox } from "@vercel/sandbox";
import { z } from "zod";
import { ToolError } from "@/lib/errors";
import type { SandboxToolDefinition } from "@/lib/tools/types";
import type { SearchIndex } from "./ngram-index";
import { buildSearchIndex } from "./ngram-index";
import { getRepoSearchOverlay } from "./overlay";
import { searchWithIndex } from "./query";

let cachedIndex: SearchIndex | null = null;
let indexSandboxId: string | null = null;

const RepoSearchInputSchema = z.object({
  pattern: z.string().min(1).max(2000),
  regex: z.boolean().default(false),
  fileGlob: z.string().optional(),
  maxResults: z.number().int().min(1).max(500).default(50),
  caseSensitive: z.boolean().default(true),
});

export const repoSearchTool: SandboxToolDefinition<z.infer<typeof RepoSearchInputSchema>> = {
  name: "repo_search",
  description:
    "Search the repository using fast indexed search with sparse n-gram acceleration for literal patterns, falling back to ripgrep for regex",
  inputSchema: RepoSearchInputSchema,
  permissions: ["fs:read", "shell:exec"],
  timeoutMs: 20_000,
  async execute(input, sandbox: Sandbox) {
    const start = Date.now();

    const sandboxKey = sandbox.sandboxId ?? String(sandbox);
    if (!cachedIndex || indexSandboxId !== sandboxKey) {
      cachedIndex = await buildSearchIndex(sandbox);
      indexSandboxId = sandboxKey;
    }

    try {
      const overlay = getRepoSearchOverlay(sandboxKey);

      const result = await searchWithIndex(sandbox, cachedIndex, input.pattern, {
        maxResults: input.maxResults,
        caseSensitive: input.caseSensitive,
        fileGlob: input.fileGlob,
        useRegex: input.regex,
        overlay,
      });

      const output =
        result.matches.length > 0
          ? result.matches.map((m) => `${m.file}:${m.line}: ${m.content}`).join("\n")
          : "No matches found";

      return {
        success: true,
        output,
        durationMs: Date.now() - start,
        metadata: {
          matchCount: result.matches.length,
          candidateFiles: result.candidateFiles,
          totalFiles: result.totalFiles,
          indexUsed: result.indexUsed,
        },
      };
    } catch (err) {
      throw new ToolError(err instanceof Error ? err.message : String(err), {
        context: { pattern: input.pattern.slice(0, 100) },
        cause: err instanceof Error ? err : undefined,
      });
    }
  },
};
