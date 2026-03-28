"use client";

import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ActivityFeed, type StreamEvent } from "./activity-feed";
import { AgentStatusPanel } from "./agent-status-panel";

interface ProcessingViewProps {
  owner: string;
  repo: string;
  pr: string;
}

const STAGE_LABEL: Record<string, string> = {
  starting: "Starting",
  recon: "Reconnaissance",
  "change-analysis": "Change analysis",
  "security-scan": "Security scan",
  "threat-synthesis": "Threat synthesis",
  "post-processing": "Finalizing",
  error: "Error",
};

async function fetchEtaMs(owner: string, repo: string, pr: string): Promise<number | undefined> {
  try {
    const res = await fetch(`/api/report/${owner}/${repo}/${pr}`);
    if (!res.ok) return undefined;
    const data = (await res.json()) as { etaMsEstimate?: number };
    return typeof data.etaMsEstimate === "number" ? data.etaMsEstimate : undefined;
  } catch {
    return undefined;
  }
}

export function ProcessingView({ owner, repo, pr }: ProcessingViewProps) {
  const router = useRouter();
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [stage, setStage] = useState<string | undefined>();
  const [elapsed, setElapsed] = useState(0);
  const [findingCounts, setFindingCounts] = useState<Record<string, number>>({});
  const [sseConnected, setSseConnected] = useState(false);
  const [etaMsEstimate, setEtaMsEstimate] = useState<number | undefined>();
  const startTime = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void fetchEtaMs(owner, repo, pr).then(setEtaMsEstimate);
  }, [owner, repo, pr]);

  const addEvent = useCallback((event: string, data: Record<string, unknown>) => {
    setEvents((prev) => [...prev, { event, data, timestamp: Date.now() }]);

    if (event === "pipeline:stage") {
      setStage(data.stage as string);
    }
    if (event === "finding:discovered") {
      const severity = data.severity as string;
      setFindingCounts((prev) => ({
        ...prev,
        [severity]: (prev[severity] ?? 0) + 1,
      }));
    }
  }, []);

  useEffect(() => {
    const url = `/api/report/${owner}/${repo}/${pr}/stream`;
    let source: EventSource | null = null;

    try {
      source = new EventSource(url);

      source.onopen = () => {
        setSseConnected(true);
        void fetchEtaMs(owner, repo, pr).then(setEtaMsEstimate);
      };

      const eventTypes = [
        "agent:started",
        "agent:completed",
        "agent:error",
        "agent:step",
        "tool:called",
        "tool:result",
        "finding:discovered",
        "pipeline:stage",
        "pipeline:complete",
      ];

      for (const type of eventTypes) {
        source.addEventListener(type, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data as string) as Record<string, unknown>;
            addEvent(type, data);
            if (type === "pipeline:complete") {
              source?.close();
              router.refresh();
            }
          } catch {
            // skip malformed event
          }
        });
      }

      source.onerror = () => {
        setSseConnected(false);
        source?.close();
      };
    } catch {
      setSseConnected(false);
    }

    return () => source?.close();
  }, [owner, repo, pr, router, addEvent]);

  useEffect(() => {
    if (sseConnected) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/report/${owner}/${repo}/${pr}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          status?: string;
          pipelineStage?: string;
          etaMsEstimate?: number;
        };
        if (data.pipelineStage) setStage(data.pipelineStage);
        if (typeof data.etaMsEstimate === "number") {
          setEtaMsEstimate(data.etaMsEstimate);
        }
        if (
          data.status === "complete" ||
          data.status === "error" ||
          data.status === "partial_error"
        ) {
          router.refresh();
        }
      } catch (err) {
        console.warn("[ProcessingView] Poll failed, will retry:", err);
      }
    }, 4000);

    return () => clearInterval(poll);
  }, [owner, repo, pr, router, sseConnected]);

  const label = stage ? (STAGE_LABEL[stage] ?? stage) : "Initializing";
  const totalFindings = Object.values(findingCounts).reduce((a, b) => a + b, 0);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const etaRemainingSec =
    etaMsEstimate != null ? Math.max(0, Math.round(etaMsEstimate / 1000) - elapsed) : undefined;
  const etaMinutes = etaRemainingSec != null ? Math.floor(etaRemainingSec / 60) : undefined;
  const etaSeconds = etaRemainingSec != null ? etaRemainingSec % 60 : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-8">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto">
            <Shield className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <h1 className="text-lg font-semibold">Multi-agent review in progress</h1>
          <p className="text-sm text-muted-foreground">
            Scanning{" "}
            <span className="font-mono text-foreground">
              {owner}/{repo}
            </span>{" "}
            PR #{pr}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
            <span className="text-primary font-medium uppercase tracking-wide">{label}</span>
            <span className="text-muted-foreground tabular-nums">
              Elapsed {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
            {etaMinutes != null && (
              <span className="text-muted-foreground tabular-nums">
                ETA ~{etaMinutes}m{etaSeconds?.toString().padStart(2, "0")}s
              </span>
            )}
            {totalFindings > 0 && (
              <span className="text-amber-400 font-medium">
                {totalFindings} finding{totalFindings !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {Object.keys(findingCounts).length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {Object.entries(findingCounts)
                .sort(([a], [b]) => {
                  const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
                  return order.indexOf(a) - order.indexOf(b);
                })
                .map(([severity, count]) => (
                  <span
                    key={severity}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      severity === "CRITICAL"
                        ? "bg-red-500/20 text-red-300"
                        : severity === "HIGH"
                          ? "bg-orange-500/20 text-orange-300"
                          : severity === "MEDIUM"
                            ? "bg-amber-500/20 text-amber-300"
                            : severity === "LOW"
                              ? "bg-slate-500/20 text-slate-300"
                              : "bg-zinc-500/20 text-zinc-300"
                    }`}
                  >
                    {count} {severity}
                  </span>
                ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <AgentStatusPanel events={events} />

          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Activity
            </h3>
            <ActivityFeed events={events} />
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            {sseConnected ? "Live streaming" : "Polling"} &middot; This page updates automatically
            when analysis completes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
