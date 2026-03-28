import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/lib/analysis/types";

interface SeverityBadgesProps {
  counts: Record<Severity, number>;
}

const severityConfig: { key: Severity; bg: string; label: string }[] = [
  { key: "CRITICAL", bg: "bg-red-600 text-white", label: "Critical" },
  { key: "HIGH", bg: "bg-orange-500 text-white", label: "High" },
  { key: "MEDIUM", bg: "bg-yellow-500 text-black", label: "Medium" },
  { key: "LOW", bg: "bg-blue-500 text-white", label: "Low" },
  { key: "INFO", bg: "bg-gray-500 text-white", label: "Info" },
];

export function SeverityBadges({ counts }: SeverityBadgesProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {severityConfig.map(({ key, bg, label }) => (
        <Badge key={key} className={`${bg} text-xs px-2.5 py-0.5`}>
          {label}: {counts[key]}
        </Badge>
      ))}
    </div>
  );
}
