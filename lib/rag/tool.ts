import { z } from "zod";
import { ToolError } from "@/lib/errors";
import type { SandboxToolDefinition } from "@/lib/tools/types";
import { retrieveContext } from "./retriever";

const SemanticSearchInputSchema = z.object({
  query: z.string().min(1).max(2000),
  topK: z.number().int().min(1).max(50).default(10),
});

export const semanticSearchTool: SandboxToolDefinition<z.infer<typeof SemanticSearchInputSchema>> =
  {
    name: "semantic_search",
    description:
      "Search repository code by meaning using semantic embeddings. Returns relevant code chunks ranked by similarity.",
    inputSchema: SemanticSearchInputSchema,
    permissions: ["fs:read"],
    timeoutMs: 30_000,
    async execute(input, sandbox) {
      const start = Date.now();
      try {
        const hits = await retrieveContext(sandbox, input.query, input.topK);

        const output = hits
          .map(
            (h) =>
              `--- ${h.chunk.filePath}:${h.chunk.startLine}-${h.chunk.endLine} (score: ${h.score.toFixed(3)}) ---\n${h.chunk.content}`,
          )
          .join("\n\n");

        return {
          success: true,
          output: output || "No relevant code found",
          durationMs: Date.now() - start,
          metadata: {
            hitCount: hits.length,
            topScore: hits[0]?.score ?? 0,
          },
        };
      } catch (err) {
        throw new ToolError(err instanceof Error ? err.message : String(err), {
          context: { query: input.query.slice(0, 200) },
          cause: err instanceof Error ? err : undefined,
        });
      }
    },
  };
