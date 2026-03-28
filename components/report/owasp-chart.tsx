"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import type { Finding, Severity } from "@/lib/analysis/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SEVERITY_CHART_COLORS } from "@/lib/constants";

interface OwaspChartProps {
  findings: Finding[];
}

const SEVERITY_PRIORITY: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

const chartConfig = {
  count: {
    label: "Findings",
  },
} satisfies ChartConfig;

interface ChartDatum {
  category: string;
  count: number;
  color: string;
}

function buildChartData(findings: Finding[]): ChartDatum[] {
  const grouped = new Map<string, { count: number; highestSeverity: Severity }>();

  for (const f of findings) {
    if ((f.category ?? "security") !== "security" || !f.owaspCategory) continue;
    const existing = grouped.get(f.owaspCategory);
    if (!existing) {
      grouped.set(f.owaspCategory, { count: 1, highestSeverity: f.severity });
    } else {
      existing.count++;
      if (SEVERITY_PRIORITY[f.severity] < SEVERITY_PRIORITY[existing.highestSeverity]) {
        existing.highestSeverity = f.severity;
      }
    }
  }

  return Array.from(grouped.entries())
    .map(([category, { count, highestSeverity }]) => ({
      category,
      count,
      color: SEVERITY_CHART_COLORS[highestSeverity],
    }))
    .sort((a, b) => b.count - a.count);
}

export function OwaspChart({ findings }: OwaspChartProps) {
  const data = buildChartData(findings);

  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground">No OWASP categories found.</p>;
  }

  const chartHeight = Math.max(120, data.length * 36);

  return (
    <div className="w-full max-w-lg">
      <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
        OWASP Top 10 Distribution
      </h3>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full max-w-lg"
        style={{ height: chartHeight }}
        initialDimension={{ width: 560, height: chartHeight }}
      >
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="category" width={180} tick={{ fontSize: 10 }} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry) => (
              <Cell key={entry.category} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
