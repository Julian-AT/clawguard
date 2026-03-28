import type { PipelineProgress } from "@/lib/analysis/pipeline";

const ORDER = [
  "recon",
  "change-analysis",
  "security-scan",
  "threat-synthesis",
  "post-processing",
] as const;

const LABELS: Record<(typeof ORDER)[number], string> = {
  recon: "Reconnaissance",
  "change-analysis": "PR summary",
  "security-scan": "Security scan",
  "threat-synthesis": "Threat synthesis",
  "post-processing": "Finalizing",
};

const HEADER = "## ClawGuard Security Audit";

function buildPhaseTable(rows: { phase: string; status: string }[]): string {
  const lines = [
    "| Phase | Status |",
    "|-------|--------|",
    ...rows.map((r) => `| ${r.phase} | ${r.status} |`),
  ];
  return `${HEADER}\n\n${lines.join("\n")}`;
}

export function formatPipelineStatusMessage(progress: PipelineProgress | null): string {
  if (progress?.stage === "error") {
    const err = progress.error.replace(/\r?\n/g, " ").trim();
    return `${HEADER}\n\n> [!WARNING]\n> **Error**\n> ${err}`;
  }

  if (!progress) {
    return buildPhaseTable(
      ORDER.map((key, i) => ({
        phase: LABELS[key],
        status: i === 0 ? "Running" : "Pending",
      })),
    );
  }

  const currentIdx = ORDER.indexOf(progress.stage as (typeof ORDER)[number]);
  const isRunning = progress.status === "running";
  const detail =
    "detail" in progress && progress.detail ? String(progress.detail).replace(/\|/g, "\\|") : "";

  const rows = ORDER.map((key, i) => {
    let status: string;
    if (currentIdx < 0) {
      status = "Pending";
    } else if (i < currentIdx) {
      status = "Complete";
    } else if (i === currentIdx) {
      if (isRunning) {
        status = detail ? `Running — ${detail}` : "Running";
      } else {
        status = "Complete";
      }
    } else {
      status = "Pending";
    }
    return { phase: LABELS[key], status };
  });

  return buildPhaseTable(rows);
}
