"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ConfidenceBarProps {
  value: number;
  className?: string;
}

export function ConfidenceBar({ value, className }: ConfidenceBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={cn("flex min-w-[7rem] items-center gap-2", className)}>
      <Progress
        value={pct}
        className={cn(
          "h-1.5 flex-1",
          pct >= 70 && "[&_[data-slot=progress-indicator]]:bg-emerald-500",
          pct >= 40 && pct < 70 && "[&_[data-slot=progress-indicator]]:bg-amber-500",
          pct < 40 && "[&_[data-slot=progress-indicator]]:bg-orange-500",
        )}
      />
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}
