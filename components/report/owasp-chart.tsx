"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Finding, Severity } from "@/lib/analysis/types";

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

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: "oklch(0.704 0.191 22.216)",
  HIGH: "oklch(0.645 0.246 16.439)",
  MEDIUM: "oklch(0.769 0.188 70.08)",
  LOW: "oklch(0.696 0.17 162.48)",
  INFO: "oklch(0.488 0.243 264.376)",
};

interface ChartDatum {
  category: string;
  count: number;
  color: string;
}

function buildChartData(findings: Finding[]): ChartDatum[] {
  const grouped = new Map<string, { count: number; highestSeverity: Severity }>();

  for (const f of findings) {
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
      color: SEVERITY_COLORS[highestSeverity],
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
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#a1a1aa" }} />
          <YAxis
            type="category"
            dataKey="category"
            width={180}
            tick={{ fontSize: 10, fill: "#a1a1aa" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 6,
              fontSize: 12,
              color: "#fafafa",
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry) => (
              <Cell key={entry.category} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
