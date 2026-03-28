import { z } from "zod";
import type { SandboxToolDefinition } from "./types";

const FileSearchInputSchema = z.object({
  pattern: z.string().min(1).max(2000),
  fileGlob: z.string().optional(),
  maxResults: z.number().int().min(1).max(500).default(50),
  caseSensitive: z.boolean().default(true),
});

export const fileSearchTool: SandboxToolDefinition<z.infer<typeof FileSearchInputSchema>> = {
  name: "file_search",
  description: "Search repository files using regex patterns (ripgrep)",
  inputSchema: FileSearchInputSchema,
  permissions: ["fs:read", "shell:exec"],
  timeoutMs: 15_000,
  async execute(input, sandbox) {
    const { pattern, fileGlob, maxResults, caseSensitive } = input;

    const args = ["--json", "--max-count", String(maxResults)];
    if (!caseSensitive) args.push("-i");
    if (fileGlob) args.push("--glob", fileGlob);
    args.push("--", pattern);

    const start = Date.now();
    try {
      const result = await sandbox.runCommand("rg", args);
      const stdout = await result.stdout();
      const stderr = await result.stderr();
      const durationMs = Date.now() - start;

      if (result.exitCode === 1 && !stdout.trim()) {
        return {
          success: true,
          output: "No matches found",
          durationMs,
          metadata: { matchCount: 0 },
        };
      }

      if (result.exitCode !== 0 && result.exitCode !== 1) {
        return {
          success: false,
          output: "",
          error: stderr.trim() || `ripgrep exited with code ${result.exitCode}`,
          durationMs,
        };
      }

      const matches: Array<{ file: string; line: number; content: string }> = [];
      for (const line of stdout.split("\n")) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line) as {
            type?: string;
            data?: {
              path?: { text?: string };
              line_number?: number;
              lines?: { text?: string };
            };
          };
          if (entry.type === "match" && entry.data) {
            matches.push({
              file: entry.data.path?.text ?? "",
              line: entry.data.line_number ?? 0,
              content: entry.data.lines?.text?.trimEnd() ?? "",
            });
          }
        } catch {
          continue;
        }
      }

      return {
        success: true,
        output: matches.map((m) => `${m.file}:${m.line}: ${m.content}`).join("\n"),
        durationMs,
        metadata: {
          matchCount: matches.length,
          totalFiles: new Set(matches.map((m) => m.file)).size,
        },
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      const stderr = err instanceof Error ? err.message : String(err);
      if (stderr.includes("exit code: 1") || stderr.includes("No matches")) {
        return {
          success: true,
          output: "No matches found",
          durationMs,
          metadata: { matchCount: 0 },
        };
      }
      return {
        success: false,
        output: "",
        error: stderr,
        durationMs,
      };
    }
  },
};
