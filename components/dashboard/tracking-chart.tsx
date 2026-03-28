"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  truePositives: {
    label: "True positives",
    color: "hsl(142 76% 36%)",
  },
  falsePositives: {
    label: "False positives",
    color: "hsl(38 92% 50%)",
  },
  misses: {
    label: "Misses",
    color: "hsl(0 72% 51%)",
  },
} satisfies ChartConfig;

export interface TrackingChartProps {
  truePositives: number;
  falsePositives: number;
  misses: number;
}

export function TrackingDistributionChart({
  truePositives,
  falsePositives,
  misses,
}: TrackingChartProps) {
  const data = (
    [
      { key: "truePositives" as const, value: truePositives },
      { key: "falsePositives" as const, value: falsePositives },
      { key: "misses" as const, value: misses },
    ] as const
  )
    .filter((d) => d.value > 0)
    .map((d) => ({ key: d.key, value: d.value }));

  if (data.length === 0) {
    return null;
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="key"
          innerRadius={56}
          outerRadius={88}
          strokeWidth={2}
          stroke="hsl(var(--background))"
        >
          {data.map((entry) => (
            <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
