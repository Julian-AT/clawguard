import { Badge } from "@/components/ui/badge";
import type { AttackSurfaceEntry } from "@/lib/analysis/types";
import { SEVERITY_BADGE_CLASS, SEVERITY_ORDER } from "@/lib/constants";

interface AttackSurfaceTableProps {
  surfaces: AttackSurfaceEntry[];
}

export function AttackSurfaceTable({ surfaces }: AttackSurfaceTableProps) {
  const sorted = [...surfaces].sort(
    (a, b) => SEVERITY_ORDER[a.riskLevel] - SEVERITY_ORDER[b.riskLevel]
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-800 text-zinc-400 text-xs uppercase">
          <tr>
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Type</th>
            <th className="text-left py-2 px-3">Exposure</th>
            <th className="text-left py-2 px-3">Risk</th>
            <th className="text-left py-2 px-3">Description</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((surface) => (
            <tr
              key={surface.name}
              className="border-b border-zinc-800/50 hover:bg-zinc-900/50"
            >
              <td className="py-2 px-3 font-medium">{surface.name}</td>
              <td className="py-2 px-3 text-muted-foreground">
                {surface.type}
              </td>
              <td className="py-2 px-3 text-muted-foreground">
                {surface.exposure}
              </td>
              <td className="py-2 px-3">
                <Badge
                  className={`${SEVERITY_BADGE_CLASS[surface.riskLevel]} text-xs`}
                >
                  {surface.riskLevel}
                </Badge>
              </td>
              <td className="py-2 px-3 text-xs text-muted-foreground max-w-md">
                {surface.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
