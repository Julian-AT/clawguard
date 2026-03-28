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
      <div className="my-4 space-y-2 rounded-lg bg-zinc-900 p-4 text-xs">
        <p className="text-red-400 font-mono">Failed to render diagram: {error}</p>
        <pre className="overflow-x-auto text-zinc-400 whitespace-pre-wrap border border-zinc-800 rounded p-2">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 h-24 animate-pulse rounded-lg bg-zinc-900" />
    );
  }

  return (
    <div
      className="my-4 overflow-x-auto rounded-lg bg-zinc-900 p-4 max-w-full [&_svg]:max-w-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
