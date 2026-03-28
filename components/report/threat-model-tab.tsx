"use client";

import { AttackSurfaceTable } from "@/components/report/attack-surface-table";
import { MermaidDiagram } from "@/components/report/mermaid-diagram";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ThreatModel } from "@/lib/analysis/types";

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
      {(threatModel.overallRisk ||
        threatModel.mergeRecommendation ||
        threatModel.compoundRiskSummary) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {threatModel.overallRisk && (
            <Card className="border-amber-500/35 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400">
                  Overall risk
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm">{threatModel.overallRisk}</p>
              </CardContent>
            </Card>
          )}
          {threatModel.mergeRecommendation && (
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wide">
                  Merge recommendation
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm font-medium text-foreground">
                  {threatModel.mergeRecommendation}
                </p>
              </CardContent>
            </Card>
          )}
          {threatModel.compoundRiskSummary && (
            <Card className="border-destructive/35 bg-destructive/5 sm:col-span-2">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase text-destructive">
                  Compound risk
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm">{threatModel.compoundRiskSummary}</p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {threatModel.strideCategorization && threatModel.strideCategorization.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">STRIDE</h3>
          <ul className="space-y-2 text-sm">
            {threatModel.strideCategorization.map((s) => (
              <li key={`${s.stride}-${s.label}`}>
                <Card size="sm" className="py-0">
                  <CardContent className="flex flex-col gap-1 py-3">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground mr-2">
                        [{s.stride}]
                      </span>
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground"> — {s.description}</span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {threatModel.trustBoundaries && threatModel.trustBoundaries.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Trust boundaries</h3>
          <div className="space-y-4">
            {threatModel.trustBoundaries.map((tb, idx) => (
              <Card key={tb.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{tb.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-sm text-muted-foreground">{tb.description}</p>
                  {tb.mermaidDiagram && (
                    <MermaidDiagram chart={tb.mermaidDiagram} id={`tb-${idx}`} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {threatModel.riskMatrix && threatModel.riskMatrix.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Risk matrix</h3>
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Likelihood</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {threatModel.riskMatrix.map((r) => (
                  <TableRow key={`${r.topic}-${r.likelihood}-${r.impact}-${r.notes}`}>
                    <TableCell>{r.topic}</TableCell>
                    <TableCell className="capitalize">{r.likelihood}</TableCell>
                    <TableCell className="capitalize">{r.impact}</TableCell>
                    <TableCell className="text-muted-foreground">{r.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {threatModel.attackSurfaces.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Attack Surfaces</h3>
          <AttackSurfaceTable surfaces={threatModel.attackSurfaces} />
        </section>
      )}

      {threatModel.attackPaths.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Attack Paths</h3>
          <div className="space-y-6">
            {threatModel.attackPaths.map((path, idx) => (
              <Card key={path.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{path.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <MermaidDiagram chart={path.mermaidDiagram} id={`attack-path-${idx}`} />
                  <p className="text-sm text-muted-foreground">{path.riskAssessment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
