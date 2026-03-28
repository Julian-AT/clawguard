import { Badge } from "@/components/ui/badge";
import type { AttackSurfaceEntry, Severity } from "@/lib/analysis/types";

interface AttackSurfaceTableProps {
  surfaces: AttackSurfaceEntry[];
}

const riskColor: Record<Severity, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-blue-500 text-white",
  INFO: "bg-gray-500 text-white",
};

const severityOrder: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

export function AttackSurfaceTable({ surfaces }: AttackSurfaceTableProps) {
  const sorted = [...surfaces].sort(
    (a, b) => severityOrder[a.riskLevel] - severityOrder[b.riskLevel]
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
                <Badge className={`${riskColor[surface.riskLevel]} text-xs`}>
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
