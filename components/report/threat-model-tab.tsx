"use client";

import type { ThreatModel } from "@/lib/analysis/types";
import { AttackSurfaceTable } from "@/components/report/attack-surface-table";
import { MermaidDiagram } from "@/components/report/mermaid-diagram";

interface ThreatModelTabProps {
  threatModel: ThreatModel | undefined;
}

export function ThreatModelTab({ threatModel }: ThreatModelTabProps) {
  if (!threatModel) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No threat model data available.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Attack Surfaces */}
      {threatModel.attackSurfaces.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Attack Surfaces</h3>
          <AttackSurfaceTable surfaces={threatModel.attackSurfaces} />
        </section>
      )}

      {/* Attack Paths */}
      {threatModel.attackPaths.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Attack Paths</h3>
          <div className="space-y-6">
            {threatModel.attackPaths.map((path, idx) => (
              <div
                key={path.name}
                className="rounded-lg border border-border bg-card p-4"
              >
                <h4 className="font-semibold text-sm mb-2">{path.name}</h4>
                <MermaidDiagram
                  chart={path.mermaidDiagram}
                  id={`attack-path-${idx}`}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {path.riskAssessment}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
