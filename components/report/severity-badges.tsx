import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/lib/analysis/types";
import { SEVERITY_BADGE_CLASS, SEVERITY_ORDER_LIST } from "@/lib/constants";

const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  INFO: "Info",
};

interface SeverityBadgesProps {
  counts: Record<Severity, number>;
}

export function SeverityBadges({ counts }: SeverityBadgesProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {SEVERITY_ORDER_LIST.map((key) => (
        <Badge key={key} className={`${SEVERITY_BADGE_CLASS[key]} text-xs px-2.5 py-0.5`}>
          {SEVERITY_LABEL[key]}: {counts[key]}
        </Badge>
      ))}
    </div>
  );
}
