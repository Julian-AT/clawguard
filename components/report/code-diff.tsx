"use client";

import dynamic from "next/dynamic";

const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), {
  ssr: false,
  loading: () => (
    <div className="h-32 animate-pulse bg-zinc-800 rounded" />
  ),
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

export function CodeDiff({ fix }: CodeDiffProps) {
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
