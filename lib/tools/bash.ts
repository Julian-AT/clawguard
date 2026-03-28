import { z } from "zod";
import type { SandboxToolDefinition } from "./types";
import { ToolError } from "@/lib/errors";

const BLOCKED_PATTERNS = [
  /rm\s+(-[rfRF]+\s+)?\/(?!tmp)/,
  /mkfs\./,
  /dd\s+.*of=\/dev/,
  />\s*\/dev\/sd/,
  /shutdown|reboot|halt|poweroff/,
];

const NETWORK_COMMANDS = /\b(curl|wget|nc|ncat|ssh|scp|telnet|ftp)\b/;

const BashInputSchema = z.object({
  command: z.string().min(1).max(10_000),
});

export function bashCommandUsesNetwork(command: string): boolean {
  return NETWORK_COMMANDS.test(command);
}

export const bashTool: SandboxToolDefinition<z.infer<typeof BashInputSchema>> = {
  name: "bash",
  description: "Execute a shell command in the sandbox",
  inputSchema: BashInputSchema,
  permissions: ["shell:exec"],
  timeoutMs: 30_000,
  async execute(input, sandbox) {
    const { command } = input;

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(command)) {
        throw new ToolError(`Blocked command: matches dangerous pattern`, {
          context: { pattern: pattern.source },
        });
      }
    }

    const start = Date.now();
    try {
      const result = await sandbox.runCommand("bash", ["-c", command]);
      const stdout = await result.stdout();
      const stderr = await result.stderr();
      const durationMs = Date.now() - start;

      return {
        success: result.exitCode === 0,
        output: stdout || stderr,
        error: result.exitCode !== 0 ? stderr || `Exit code: ${result.exitCode}` : undefined,
        durationMs,
        metadata: { exitCode: result.exitCode },
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      return {
        success: false,
        output: "",
        error: err instanceof Error ? err.message : String(err),
        durationMs,
      };
    }
  },
};
