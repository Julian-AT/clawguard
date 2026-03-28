"use client";

import type { PRSummary } from "@/lib/analysis/types";
import { MermaidDiagram } from "@/components/report/mermaid-diagram";

interface PrSummaryTabProps {
  prSummary: PRSummary | undefined;
}

export function PrSummaryTab({ prSummary }: PrSummaryTabProps) {
  if (!prSummary) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No PR summary available for this audit.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold mb-2">Change narrative</h3>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {prSummary.narrative}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Estimated complexity:{" "}
          <span className="font-medium text-foreground">{prSummary.complexity}</span>
        </p>
      </section>

      {prSummary.breakingChanges.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-2">Breaking changes</h3>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {prSummary.breakingChanges.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      {prSummary.dependencyImpact.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Dependency impact</h3>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-2">File</th>
                  <th className="text-left p-2">Impact</th>
                  <th className="text-left p-2">Related</th>
                </tr>
              </thead>
              <tbody>
                {prSummary.dependencyImpact.map((d) => (
                  <tr key={d.file} className="border-b border-border/60">
                    <td className="p-2 font-mono text-xs">{d.file}</td>
                    <td className="p-2">{d.impactType}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {d.impactedBy.join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {prSummary.sequenceDiagrams.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Sequence diagrams</h3>
          <div className="space-y-6">
            {prSummary.sequenceDiagrams.map((sd, idx) => (
              <div
                key={`${sd.title}-${idx}`}
                className="rounded-lg border border-border bg-card p-4"
              >
                <h4 className="font-semibold text-sm mb-1">{sd.title}</h4>
                <p className="text-xs text-muted-foreground mb-3">{sd.description}</p>
                <MermaidDiagram chart={sd.mermaidDiagram} id={`pr-seq-${idx}`} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
