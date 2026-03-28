"use client";

import type { Finding } from "@/lib/analysis/types";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface FindingCardProps {
  finding: Finding;
  value: string;
}

const severityColor: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-blue-500 text-white",
  INFO: "bg-gray-500 text-white",
};

export function FindingCard({ finding, value }: FindingCardProps) {
  return (
    <AccordionItem
      value={value}
      className="rounded-lg border border-border bg-card px-4"
    >
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={`${severityColor[finding.severity]} text-xs`}>
            {finding.severity}
          </Badge>
          <span className="font-semibold text-sm">
            {finding.title ?? finding.type}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {finding.file}:{finding.line}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {finding.cweId}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {finding.owaspCategory}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {finding.description}
        </p>

        {/* Attack scenario callout */}
        <div className="border-l-4 border-red-500 bg-red-500/10 rounded-r-md p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-1">
            Attack Scenario
          </h4>
          <p className="text-sm text-foreground/90">{finding.attackScenario}</p>
        </div>

        {/* Compliance badges */}
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

        {/* Mermaid diagram placeholder -- wired in Task 04 */}
        {finding.dataFlow && (
          <div className="text-xs text-muted-foreground">
            Data flow: {finding.dataFlow.nodes.map((n) => n.label).join(" -> ")}
          </div>
        )}

        {/* Code diff placeholder -- wired in Task 04 */}
        {finding.fix && (
          <div className="text-xs text-muted-foreground font-mono">
            Fix available ({finding.fix.before.split("\n").length} lines)
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
