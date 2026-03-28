import { Badge } from "@/components/ui/badge";
import type { Finding } from "@/lib/analysis/types";
import { SEVERITY_BADGE_CLASS, SEVERITY_ORDER } from "@/lib/constants";

interface ComplianceTabProps {
  findings: Finding[];
}

function renderMapping(values: string[] | undefined): React.ReactNode {
  if (!values || values.length === 0) {
    return <span className="text-zinc-600">&mdash;</span>;
  }
  return values.join(", ");
}

export function ComplianceTab({ findings }: ComplianceTabProps) {
  const withCompliance = findings
    .filter((f) => f.complianceMapping)
    .sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    );

  if (withCompliance.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No compliance mapping data available.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-800 text-zinc-400 text-xs uppercase">
          <tr>
            <th className="text-left py-2 px-3">Finding</th>
            <th className="text-left py-2 px-3">CWE</th>
            <th className="text-left py-2 px-3">PCI DSS</th>
            <th className="text-left py-2 px-3">SOC 2</th>
            <th className="text-left py-2 px-3">HIPAA</th>
            <th className="text-left py-2 px-3">NIST</th>
            <th className="text-left py-2 px-3">OWASP ASVS</th>
          </tr>
        </thead>
        <tbody>
          {withCompliance.map((f) => (
            <tr
              key={f.id ?? `${f.file}:${f.line}`}
              className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
            >
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`${SEVERITY_BADGE_CLASS[f.severity]} text-[10px] shrink-0`}
                  >
                    {f.severity}
                  </Badge>
                  <span className="text-xs">{f.type}</span>
                </div>
              </td>
              <td className="py-2 px-3 font-mono text-xs">{f.cweId}</td>
              <td className="py-2 px-3 font-mono text-xs">
                {renderMapping(f.complianceMapping?.pciDss)}
              </td>
              <td className="py-2 px-3 font-mono text-xs">
                {renderMapping(f.complianceMapping?.soc2)}
              </td>
              <td className="py-2 px-3 font-mono text-xs">
                {renderMapping(f.complianceMapping?.hipaa)}
              </td>
              <td className="py-2 px-3 font-mono text-xs">
                {renderMapping(f.complianceMapping?.nist)}
              </td>
              <td className="py-2 px-3 font-mono text-xs">
                {renderMapping(f.complianceMapping?.owaspAsvs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
