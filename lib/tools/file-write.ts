import { z } from "zod";
import { ToolError } from "@/lib/errors";
import { registerRepoSearchOverlay } from "@/lib/tools/search/overlay";
import type { SandboxToolDefinition } from "./types";

const FileWriteInputSchema = z.object({
  path: z.string().min(1).max(1000),
  content: z.string(),
});

export const fileWriteTool: SandboxToolDefinition<z.infer<typeof FileWriteInputSchema>> = {
  name: "file_write",
  description: "Write content to a file in the repository",
  inputSchema: FileWriteInputSchema,
  permissions: ["fs:write"],
  timeoutMs: 10_000,
  async execute(input, sandbox) {
    const { path, content } = input;

    if (path.includes("..") || path.startsWith("/")) {
      throw new ToolError("Path traversal not allowed", {
        context: { path },
      });
    }

    const FORBIDDEN_PATHS = [".git/", "node_modules/", ".env"];
    for (const forbidden of FORBIDDEN_PATHS) {
      if (path.startsWith(forbidden) || path === forbidden.replace("/", "")) {
        throw new ToolError(`Writing to ${forbidden} is not allowed`, {
          context: { path },
        });
      }
    }

    const start = Date.now();
    try {
      await sandbox.writeFiles([{ path, content: Buffer.from(content, "utf-8") }]);
      const sid = sandbox.sandboxId;
      if (sid) registerRepoSearchOverlay(sid, path, content);
      return {
        success: true,
        output: `Written ${content.length} bytes to ${path}`,
        durationMs: Date.now() - start,
        metadata: { path, size: content.length },
      };
    } catch (err) {
      throw new ToolError(err instanceof Error ? err.message : String(err), {
        context: { path },
        cause: err instanceof Error ? err : undefined,
      });
    }
  },
};
