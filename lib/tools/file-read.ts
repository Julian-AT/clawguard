import { z } from "zod";
import { ToolError } from "@/lib/errors";
import type { SandboxToolDefinition } from "./types";

const MAX_FILE_SIZE = 512_000;

const FileReadInputSchema = z.object({
  path: z.string().min(1).max(1000),
  startLine: z.number().int().min(1).optional(),
  endLine: z.number().int().min(1).optional(),
});

export const fileReadTool: SandboxToolDefinition<z.infer<typeof FileReadInputSchema>> = {
  name: "file_read",
  description: "Read a file from the repository with optional line range",
  inputSchema: FileReadInputSchema,
  permissions: ["fs:read"],
  timeoutMs: 10_000,
  async execute(input, sandbox) {
    const { path, startLine, endLine } = input;

    if (path.includes("..") || path.startsWith("/")) {
      throw new ToolError("Path traversal not allowed", {
        context: { path },
      });
    }

    const start = Date.now();
    try {
      const buf = await sandbox.readFileToBuffer({ path });
      if (!buf) {
        throw new ToolError(`File not found: ${path}`, {
          context: { path },
        });
      }

      if (buf.length > MAX_FILE_SIZE) {
        throw new ToolError(`File too large (${buf.length} bytes, max ${MAX_FILE_SIZE})`, {
          context: { path, size: buf.length },
        });
      }

      let text = buf.toString("utf-8");

      if (startLine || endLine) {
        const lines = text.split("\n");
        const s = (startLine ?? 1) - 1;
        const e = endLine ?? lines.length;
        text = lines.slice(s, e).join("\n");
      }

      return {
        success: true,
        output: text,
        durationMs: Date.now() - start,
        metadata: { path, size: buf.length },
      };
    } catch (err) {
      if (err instanceof ToolError) throw err;
      throw new ToolError(err instanceof Error ? err.message : String(err), {
        context: { path: input.path },
        cause: err instanceof Error ? err : undefined,
      });
    }
  },
};
