import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Finding } from "@/lib/analysis/types";
import { SEVERITY_BADGE_CLASS, SEVERITY_ORDER } from "@/lib/constants";

interface ComplianceTabProps {
  findings: Finding[];
}

function renderMapping(values: string[] | undefined): ReactNode {
  if (!values || values.length === 0) {
    return <span className="text-muted-foreground">&mdash;</span>;
  }
  return values.join(", ");
}

export function ComplianceTab({ findings }: ComplianceTabProps) {
  const withCompliance = findings
    .filter((f) => f.complianceMapping)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  if (withCompliance.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No compliance mapping data available.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase text-muted-foreground">Finding</TableHead>
          <TableHead className="text-xs uppercase text-muted-foreground">CWE</TableHead>
          <TableHead className="text-xs uppercase text-muted-foreground">PCI DSS</TableHead>
          <TableHead className="text-xs uppercase text-muted-foreground">SOC 2</TableHead>
          <TableHead className="text-xs uppercase text-muted-foreground">HIPAA</TableHead>
          <TableHead className="text-xs uppercase text-muted-foreground">NIST</TableHead>
          <TableHead className="text-xs uppercase text-muted-foreground">OWASP ASVS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {withCompliance.map((f) => (
          <TableRow key={f.id ?? `${f.file}:${f.line}`}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Badge className={`${SEVERITY_BADGE_CLASS[f.severity]} text-[10px] shrink-0`}>
                  {f.severity}
                </Badge>
                <span className="text-xs">{f.type}</span>
              </div>
            </TableCell>
            <TableCell className="font-mono text-xs">{f.cweId}</TableCell>
            <TableCell className="font-mono text-xs">
              {renderMapping(f.complianceMapping?.pciDss)}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {renderMapping(f.complianceMapping?.soc2)}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {renderMapping(f.complianceMapping?.hipaa)}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {renderMapping(f.complianceMapping?.nist)}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {renderMapping(f.complianceMapping?.owaspAsvs)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
