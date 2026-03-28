import type { Sandbox } from "@vercel/sandbox";
import { z } from "zod";
import type { SandboxToolDefinition } from "@/lib/tools/types";
import type { SearchIndex } from "./ngram-index";
import { buildSearchIndex } from "./ngram-index";
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

    const sandboxKey = sandbox.sandboxId;
    if (!cachedIndex || indexSandboxId !== sandboxKey) {
      cachedIndex = await buildSearchIndex(sandbox);
      indexSandboxId = sandboxKey;
    }

    try {
      const result = await searchWithIndex(sandbox, cachedIndex, input.pattern, {
        maxResults: input.maxResults,
        caseSensitive: input.caseSensitive,
        fileGlob: input.fileGlob,
        useRegex: input.regex,
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
      return {
        success: false,
        output: "",
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      };
    }
  },
};
