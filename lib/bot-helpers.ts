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

export function formatPipelineStatusMessage(
  progress: PipelineProgress | null
): string {
  if (progress?.stage === "error") {
    return `## 🛡️ ClawGuard Security Audit\n\n❌ **Error:** ${progress.error}`;
  }

  if (!progress) {
    return `## 🛡️ ClawGuard Security Audit\n\n⏳ Starting…`;
  }

  const currentIdx = ORDER.indexOf(
    progress.stage as (typeof ORDER)[number]
  );
  const isRunning = progress.status === "running";

  const lines = ORDER.map((key, i) => {
    let icon = "⬜";
    if (currentIdx < 0) {
      icon = "⬜";
    } else if (i < currentIdx) {
      icon = "✅";
    } else if (i === currentIdx) {
      icon = isRunning ? "⏳" : "✅";
    }
    const detail =
      "detail" in progress &&
      progress.stage === key &&
      progress.detail
        ? ` _${progress.detail}_`
        : "";
    return `${icon} **${LABELS[key]}**${detail}`;
  });

  return `## 🛡️ ClawGuard Security Audit\n\n${lines.join("\n")}`;
}
