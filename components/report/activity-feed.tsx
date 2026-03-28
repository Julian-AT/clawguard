"use client";

import { AlertTriangle, Bug, CheckCircle2, Loader2, Shield, Wrench } from "lucide-react";
import { useEffect, useRef } from "react";

export interface StreamEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface ActivityFeedProps {
  events: StreamEvent[];
}

function eventIcon(event: string) {
  if (event.startsWith("agent:started"))
    return <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />;
  if (event.startsWith("agent:completed"))
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (event.startsWith("agent:error"))
    return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
  if (event.startsWith("tool:")) return <Wrench className="h-3.5 w-3.5 text-zinc-400" />;
  if (event.startsWith("finding:")) return <Bug className="h-3.5 w-3.5 text-amber-400" />;
  return <Shield className="h-3.5 w-3.5 text-zinc-500" />;
}

function eventLabel(evt: StreamEvent): string {
  const d = evt.data;
  switch (evt.event) {
    case "agent:started":
      return `${d.agentName} started`;
    case "agent:completed":
      return `${d.agentName} completed (${d.findingCount} findings, ${Math.round((d.durationMs as number) / 1000)}s)`;
    case "agent:error":
      return `${d.agentName} failed: ${(d.error as string)?.slice(0, 80)}`;
    case "tool:called":
      return `${d.toolName}: ${(d.inputSummary as string)?.slice(0, 60)}`;
    case "tool:result":
      return `${d.toolName} ${d.success ? "ok" : "failed"} (${d.durationMs}ms)`;
    case "finding:discovered":
      return `[${d.severity}] ${d.type} in ${d.file}:${d.line}`;
    case "pipeline:stage":
      return `Stage: ${d.stage} ${d.status}`;
    default:
      return evt.event;
  }
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when the stream appends events
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4">Waiting for events...</div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-xs">
      {events.map((evt) => (
        <div
          key={`${evt.timestamp}-${evt.event}-${eventLabel(evt)}`}
          className="flex items-start gap-2 py-0.5 px-1 rounded hover:bg-muted/30"
        >
          <span className="mt-0.5 shrink-0">{eventIcon(evt.event)}</span>
          <span className="text-muted-foreground shrink-0 tabular-nums">
            {new Date(evt.timestamp).toLocaleTimeString([], { hour12: false })}
          </span>
          <span className="text-foreground/80 break-all">{eventLabel(evt)}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
