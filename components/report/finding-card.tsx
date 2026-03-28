"use client";

import { CodeDiff } from "@/components/report/code-diff";
import { MermaidDiagram } from "@/components/report/mermaid-diagram";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { Finding } from "@/lib/analysis/types";
import { SEVERITY_BADGE_CLASS } from "@/lib/constants";

interface FindingCardProps {
  finding: Finding;
  value: string;
}

function buildDataFlowChart(nodes: { label: string; type: string }[]): string {
  if (nodes.length === 0) return "graph LR\n  A[No data]";

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lines = ["graph LR"];
  for (let i = 0; i < nodes.length; i++) {
    const id = letters[i] ?? `N${i}`;
    const label = nodes[i].label.replace(/[[\]]/g, "");
    if (i === 0) {
      lines.push(`  ${id}["${label}"]`);
    } else {
      const prevId = letters[i - 1] ?? `N${i - 1}`;
      lines.push(`  ${prevId} --> ${id}["${label}"]`);
    }
  }
  return lines.join("\n");
}

export function FindingCard({ finding, value }: FindingCardProps) {
  return (
    <AccordionItem value={value} className="rounded-lg border border-border bg-card px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={`${SEVERITY_BADGE_CLASS[finding.severity]} text-xs`}>
            {finding.severity}
          </Badge>
          <span className="font-semibold text-sm">{finding.title ?? finding.type}</span>
          <span className="text-xs text-muted-foreground font-mono">
            {finding.file}:{finding.line}
          </span>
          {finding.cweId && (
            <Badge variant="outline" className="text-[10px]">
              {finding.cweId}
            </Badge>
          )}
          {finding.owaspCategory && (
            <Badge variant="secondary" className="text-[10px]">
              {finding.owaspCategory}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] capitalize">
            {finding.category ?? "security"}
          </Badge>
          {finding.remediationEffort && (
            <Badge variant="outline" className="text-[10px] capitalize">
              Effort: {finding.remediationEffort}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{finding.description}</p>

        {finding.attackScenario && (
          <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
            <AlertTitle className="text-xs font-semibold uppercase tracking-wide">
              Attack scenario
            </AlertTitle>
            <AlertDescription className="text-sm text-foreground/90">
              {finding.attackScenario}
            </AlertDescription>
          </Alert>
        )}

        {finding.complianceMapping && (
          <div className="flex flex-wrap gap-2">
            {finding.complianceMapping.pciDss.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                PCI DSS: {finding.complianceMapping.pciDss.join(", ")}
              </Badge>
            )}
            {finding.complianceMapping.soc2.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                SOC 2: {finding.complianceMapping.soc2.join(", ")}
              </Badge>
            )}
            {finding.complianceMapping.hipaa.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                HIPAA: {finding.complianceMapping.hipaa.join(", ")}
              </Badge>
            )}
            {finding.complianceMapping.nist.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                NIST: {finding.complianceMapping.nist.join(", ")}
              </Badge>
            )}
            {finding.complianceMapping.owaspAsvs.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                OWASP ASVS: {finding.complianceMapping.owaspAsvs.join(", ")}
              </Badge>
            )}
          </div>
        )}

        {finding.dataFlow &&
          (finding.dataFlow.mermaidDiagram || finding.dataFlow.nodes.length > 0) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Data Flow
              </h4>
              <MermaidDiagram
                id={`dataflow-${value}`}
                chart={
                  finding.dataFlow.mermaidDiagram ?? buildDataFlowChart(finding.dataFlow.nodes)
                }
              />
            </div>
          )}

        {finding.fix && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Suggested Fix
            </h4>
            <CodeDiff fix={finding.fix} />
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
