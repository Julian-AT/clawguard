"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

interface ScoreGaugeProps {
  score: number;
  grade: string;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "oklch(0.696 0.17 162.48)";
  if (score >= 80) return "oklch(0.769 0.188 70.08)";
  if (score >= 70) return "oklch(0.627 0.265 303.9)";
  if (score >= 60) return "oklch(0.645 0.246 16.439)";
  return "oklch(0.704 0.191 22.216)";
}

export function ScoreGauge({ score, grade }: ScoreGaugeProps) {
  const color = getScoreColor(score);
  const data = [{ name: "score", value: score, fill: color }];

  return (
    <div className="relative flex flex-col items-center">
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
        <RadialBar
          background={{ fill: "oklch(0.269 0 0)" }}
          dataKey="value"
          angleAxisId={0}
          cornerRadius={8}
        />
      </RadialBarChart>
      <div className="absolute bottom-4 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground -mt-0.5">
          / 100 &middot; Grade{" "}
          <span className="font-bold text-sm" style={{ color }}>
            {grade}
          </span>
        </span>
      </div>
    </div>
  );
}
