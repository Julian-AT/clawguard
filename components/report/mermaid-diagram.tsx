"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  id: string;
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("mermaid")
      .then(({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#09090b",
            primaryColor: "#3b82f6",
            primaryTextColor: "#fafafa",
            lineColor: "#a1a1aa",
          },
        });
        return mermaid.render(`mermaid-${id}`, chart);
      })
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
      <div className="my-4 rounded-lg bg-zinc-900 p-4 text-xs text-red-400 font-mono">
        Failed to render diagram: {error}
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
      ref={containerRef}
      className="my-4 overflow-x-auto rounded-lg bg-zinc-900 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
