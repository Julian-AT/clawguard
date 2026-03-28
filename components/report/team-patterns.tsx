import type { TeamPattern } from "@/lib/analysis/types";

interface TeamPatternsProps {
  patterns: TeamPattern[];
}

export function TeamPatterns({ patterns }: TeamPatternsProps) {
  if (!patterns.length) return null;

  return (
    <section className="rounded-xl border border-border bg-card/50 p-5 space-y-3 print:break-inside-avoid">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        What this team keeps doing
      </h2>
      <ul className="space-y-3">
        {patterns.map((p) => (
          <li key={`${p.pattern}::${p.evidence}`.slice(0, 200)} className="text-sm">
            <p className="font-medium text-foreground">{p.pattern}</p>
            <p className="text-muted-foreground text-xs mt-1">{p.evidence}</p>
            {p.elevated && (
              <span className="text-xs text-amber-500/90 mt-1 inline-block">Elevated</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
