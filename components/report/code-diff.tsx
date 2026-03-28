"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse bg-zinc-800 rounded" />,
});

interface CodeDiffProps {
  fix: {
    before: string;
    after: string;
    file?: string;
    startLine?: number;
    endLine?: number;
  };
}

function langFromPath(path?: string): string {
  if (!path) return "typescript";
  if (/\.tsx?$/i.test(path)) return "tsx";
  if (/\.jsx?$/i.test(path)) return "javascript";
  if (/\.py$/i.test(path)) return "python";
  if (/\.go$/i.test(path)) return "go";
  if (/\.rs$/i.test(path)) return "rust";
  if (/\.ya?ml$/i.test(path)) return "yaml";
  if (/\.json$/i.test(path)) return "json";
  return "typescript";
}

export function CodeDiff({ fix }: CodeDiffProps) {
  const lang = langFromPath(fix.file);
  const [beforeHtml, setBeforeHtml] = useState<string | null>(null);
  const [afterHtml, setAfterHtml] = useState<string | null>(null);
  const [useShiki, setUseShiki] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const shikiLang = lang === "tsx" ? "typescript" : lang;
        const [b, a] = await Promise.all([
          codeToHtml(fix.before, { lang: shikiLang, theme: "github-dark" }),
          codeToHtml(fix.after, { lang: shikiLang, theme: "github-dark" }),
        ]);
        if (!cancelled) {
          setBeforeHtml(b);
          setAfterHtml(a);
        }
      } catch {
        if (!cancelled) {
          setUseShiki(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [fix.before, fix.after, lang]);

  if (!useShiki || !beforeHtml || !afterHtml) {
    return (
      <div className="my-4 rounded-lg overflow-hidden border border-zinc-800">
        {fix.file && (
          <div className="px-3 py-1.5 bg-zinc-800 text-xs text-zinc-400 font-mono">
            {fix.file}
            {fix.startLine != null && `:${fix.startLine}`}
            {fix.endLine != null && `-${fix.endLine}`}
          </div>
        )}
        <ReactDiffViewer
          oldValue={fix.before}
          newValue={fix.after}
          splitView={true}
          useDarkTheme={true}
          leftTitle="Before"
          rightTitle="After"
        />
      </div>
    );
  }

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-zinc-800">
      {fix.file && (
        <div className="px-3 py-1.5 bg-zinc-800 text-xs text-zinc-400 font-mono">
          {fix.file}
          {fix.startLine != null && `:${fix.startLine}`}
          {fix.endLine != null && `-${fix.endLine}`}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-0 divide-x divide-zinc-800">
        <div className="overflow-x-auto text-xs [&_pre]:m-0 [&_pre]:bg-transparent!">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: HTML from Shiki highlighter (trusted pipeline output) */}
          <div className="p-2" dangerouslySetInnerHTML={{ __html: beforeHtml }} />
        </div>
        <div className="overflow-x-auto text-xs [&_pre]:m-0 [&_pre]:bg-transparent!">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: HTML from Shiki highlighter (trusted pipeline output) */}
          <div className="p-2" dangerouslySetInnerHTML={{ __html: afterHtml }} />
        </div>
      </div>
    </div>
  );
}
