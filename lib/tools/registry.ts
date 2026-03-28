import type { Sandbox } from "@vercel/sandbox";
import { ToolError } from "@/lib/errors";
import { semanticSearchTool } from "@/lib/rag/tool";

import { bashCommandUsesNetwork, bashTool } from "./bash";
import { fileReadTool } from "./file-read";
import { fileSearchTool } from "./file-search";
import { fileWriteTool } from "./file-write";
import { repoSearchTool } from "./search/tool";
import type { SandboxToolDefinition, ToolInvocation, ToolPermission, ToolResult } from "./types";

const ALL_TOOLS: SandboxToolDefinition[] = [
  bashTool,
  fileReadTool,
  fileWriteTool,
  fileSearchTool,
  repoSearchTool,
  semanticSearchTool,
];

function raceWithTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(onTimeout()), ms);
  });
  return Promise.race([
    promise.finally(() => {
      clearTimeout(timeoutId);
    }),
    timeoutPromise,
  ]);
}

export class ToolRegistry {
  private tools = new Map<string, SandboxToolDefinition>();

  constructor() {
    for (const tool of ALL_TOOLS) {
      this.tools.set(tool.name, tool);
    }
  }

  register(tool: SandboxToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  getToolsForPermissions(permissions: ToolPermission[]): SandboxToolDefinition[] {
    return [...this.tools.values()].filter((tool) =>
      tool.permissions.every((p) => permissions.includes(p)),
    );
  }

  getToolByName(name: string): SandboxToolDefinition | undefined {
    return this.tools.get(name);
  }

  listTools(): Array<{ name: string; description: string; permissions: ToolPermission[] }> {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      permissions: t.permissions,
    }));
  }

  async invoke(
    invocation: ToolInvocation,
    sandbox: Sandbox,
    grantedPermissions: ToolPermission[],
  ): Promise<ToolResult> {
    const tool = this.tools.get(invocation.toolName);
    if (!tool) {
      throw new ToolError(`Unknown tool: ${invocation.toolName}`);
    }

    const missingPerms = tool.permissions.filter((p) => !grantedPermissions.includes(p));
    if (missingPerms.length > 0) {
      throw new ToolError(
        `Agent lacks permissions for ${invocation.toolName}: ${missingPerms.join(", ")}`,
        { context: { missing: missingPerms, agent: invocation.agentId } },
      );
    }

    const parsed = tool.inputSchema.safeParse(invocation.input);
    if (!parsed.success) {
      throw new ToolError(`Invalid input for ${invocation.toolName}: ${parsed.error.message}`, {
        context: { issues: parsed.error.flatten() },
      });
    }

    if (invocation.toolName === bashTool.name) {
      const data = parsed.data as { command: string };
      if (
        bashCommandUsesNetwork(data.command) &&
        !grantedPermissions.includes("network:outbound")
      ) {
        throw new ToolError("Network commands require network:outbound permission", {
          context: { tool: invocation.toolName },
        });
      }
    }

    try {
      const result = await raceWithTimeout(
        tool.execute(parsed.data, sandbox),
        tool.timeoutMs,
        () => new ToolError(`Tool ${invocation.toolName} timed out after ${tool.timeoutMs}ms`),
      );

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      throw err instanceof ToolError ? err : new ToolError(message, { cause: err });
    }
  }
}

let _registry: ToolRegistry | undefined;

export function getToolRegistry(): ToolRegistry {
  if (!_registry) {
    _registry = new ToolRegistry();
  }
  return _registry;
}
