"use client";

import {
  BookOpen,
  CheckCircle2,
  FileText,
  GitBranch,
  Loader2,
  type LucideIcon,
  Network,
  Shield,
  Sparkles,
  TestTube2,
  XCircle,
  Zap,
} from "lucide-react";
import type { StreamEvent } from "./activity-feed";

const AGENT_ICONS: Record<string, LucideIcon> = {
  "security-scan": Shield,
  "dependency-audit": GitBranch,
  "secret-scanner": Shield,
  "infrastructure-review": Network,
  "api-security": Shield,
  "compliance-auditor": FileText,
  pentest: Shield,
  "code-quality": Sparkles,
  architecture: Network,
  "test-coverage": TestTube2,
  documentation: BookOpen,
  performance: Zap,
  "pr-summary": FileText,
  learnings: Sparkles,
};

interface AgentState {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  findingCount?: number;
  durationMs?: number;
  error?: string;
}

interface AgentStatusPanelProps {
  events: StreamEvent[];
}

function deriveAgentStates(events: StreamEvent[]): AgentState[] {
  const agents = new Map<string, AgentState>();

  for (const evt of events) {
    const name = evt.data.agentName as string | undefined;
    if (!name) continue;

    if (evt.event === "agent:started") {
      agents.set(name, { name, status: "running" });
    } else if (evt.event === "agent:completed") {
      agents.set(name, {
        name,
        status: "completed",
        findingCount: evt.data.findingCount as number,
        durationMs: evt.data.durationMs as number,
      });
    } else if (evt.event === "agent:error") {
      agents.set(name, {
        name,
        status: "failed",
        error: (evt.data.error as string)?.slice(0, 100),
      });
    }
  }

  return [...agents.values()];
}

function statusIcon(status: AgentState["status"], agentName: string) {
  const Icon = AGENT_ICONS[agentName] ?? Shield;
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-400" />;
    default:
      return <Icon className="h-4 w-4 text-zinc-500" />;
  }
}

export function AgentStatusPanel({ events }: AgentStatusPanelProps) {
  const agents = deriveAgentStates(events);

  if (agents.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {agents.map((agent) => (
        <div
          key={agent.name}
          className="rounded-lg border border-border bg-card/50 px-3 py-2 flex items-center gap-2"
        >
          {statusIcon(agent.status, agent.name)}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{agent.name}</p>
            {agent.status === "completed" && (
              <p className="text-[10px] text-muted-foreground">
                {agent.findingCount} finding{agent.findingCount !== 1 ? "s" : ""} &middot;{" "}
                {Math.round((agent.durationMs ?? 0) / 1000)}s
              </p>
            )}
            {agent.status === "failed" && (
              <p className="text-[10px] text-red-400 truncate">{agent.error}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
