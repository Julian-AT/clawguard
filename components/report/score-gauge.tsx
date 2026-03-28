"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { GRADE_BADGE_CLASS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  grade: string;
}

/** Green → lime → amber → orange → red (no purple/blue mid-band). */
function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 80) return "#84cc16";
  if (score >= 70) return "#eab308";
  if (score >= 60) return "#f97316";
  return "#ef4444";
}

export function ScoreGauge({ score, grade }: ScoreGaugeProps) {
  const color = getScoreColor(score);
  const chartConfig = {
    score: {
      label: "Security score",
      color,
    },
  } satisfies ChartConfig;

  const data = [{ name: "score", value: score, fill: "var(--color-score)" }];

  return (
    <div className="relative flex flex-col items-center">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-auto h-[130px] w-[220px]"
        initialDimension={{ width: 220, height: 130 }}
      >
        <RadialBarChart
          width={220}
          height={130}
          cx={110}
          cy={120}
          innerRadius={80}
          outerRadius={115}
          barSize={16}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey="value" angleAxisId={0} cornerRadius={8} />
        </RadialBarChart>
      </ChartContainer>
      <div className="absolute bottom-4 flex flex-col items-center gap-1 animate-in fade-in zoom-in-95 duration-500">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>/ 100</span>
          <span className="text-muted-foreground/80">Grade</span>
          <Badge
            variant="outline"
            className={cn(
              "h-6 min-w-7 justify-center px-1.5 font-semibold tabular-nums",
              GRADE_BADGE_CLASS[grade] ?? "border-border text-foreground",
            )}
          >
            {grade}
          </Badge>
        </div>
      </div>
    </div>
  );
}
