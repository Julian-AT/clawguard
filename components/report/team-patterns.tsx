import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { TeamPattern } from "@/lib/analysis/types";

interface TeamPatternsProps {
  patterns: TeamPattern[];
}

export function TeamPatterns({ patterns }: TeamPatternsProps) {
  if (!patterns.length) return null;

  return (
    <Card className="print:break-inside-avoid">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-semibold uppercase tracking-wide">
          What this team keeps doing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <ul className="space-y-3">
          {patterns.map((p) => (
            <li key={`${p.pattern}::${p.evidence}`.slice(0, 200)} className="text-sm">
              <p className="font-medium text-foreground">{p.pattern}</p>
              <p className="text-muted-foreground text-xs mt-1">{p.evidence}</p>
              {p.elevated && (
                <span className="text-xs text-amber-600 dark:text-amber-400 mt-1 inline-block">
                  Elevated
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
