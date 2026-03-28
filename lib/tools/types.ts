import { z } from "zod";
import type { Sandbox } from "@vercel/sandbox";

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface SandboxToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  permissions: ToolPermission[];
  timeoutMs: number;
  execute(input: TInput, sandbox: Sandbox): Promise<ToolResult>;
}

export type ToolPermission =
  | "fs:read"
  | "fs:write"
  | "shell:exec"
  | "network:outbound"
  | "process:spawn";

export interface ToolInvocation {
  toolName: string;
  input: unknown;
  agentId: string;
  runId: string;
}
