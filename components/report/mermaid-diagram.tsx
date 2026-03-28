"use client";

import { useEffect, useState } from "react";
import { getMermaid } from "@/lib/mermaid-init";

interface MermaidDiagramProps {
  chart: string;
  id: string;
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMermaid()
      .then((mermaid) => mermaid.render(`mermaid-${id}`, chart))
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) setSvg(renderedSvg);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="my-4 space-y-2 rounded-lg bg-secondary p-4 text-xs text-foreground">
        <p className="font-mono text-destructive">Failed to render diagram: {error}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-border p-2 text-muted-foreground">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return <div className="my-4 h-24 animate-pulse rounded-lg bg-secondary" />;
  }

  return (
    <div
      className="my-4 max-w-full overflow-x-auto rounded-lg bg-secondary p-4 text-foreground [&_svg]:max-w-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
