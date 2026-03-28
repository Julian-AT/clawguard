"use client";

import { Target } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PrecisionStatCardProps {
  precision: number | null;
}

export function PrecisionStatCard({ precision }: PrecisionStatCardProps) {
  const pct = precision != null ? precision * 100 : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-primary">
          <Target className="size-4 shrink-0" aria-hidden />
          <CardDescription>Precision (est.)</CardDescription>
        </div>
        <CardTitle className="text-3xl tabular-nums">
          {pct != null ? `${pct.toFixed(1)}%` : "—"}
        </CardTitle>
        {pct != null ? <Progress value={pct} className="mt-2 h-2" /> : null}
        <p className="pt-1 text-xs text-muted-foreground">TP / (TP + FP)</p>
      </CardHeader>
    </Card>
  );
}
