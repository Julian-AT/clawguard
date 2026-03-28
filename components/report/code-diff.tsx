"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

interface CodeDiffProps {
  fix: {
    before: string;
    after: string;
    file?: string;
    startLine?: number;
    endLine?: number;
  };
}

/** Shiki language id inferred from file path (must match bundled grammars). */
function langFromPath(path?: string): string {
  if (!path) return "typescript";
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx")) return "tsx";
  if (lower.endsWith(".jsx")) return "jsx";
  if (lower.endsWith(".ts") || lower.endsWith(".mts") || lower.endsWith(".cts"))
    return "typescript";
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs"))
    return "javascript";
  if (lower.endsWith(".py")) return "python";
  if (lower.endsWith(".go")) return "go";
  if (lower.endsWith(".rs")) return "rust";
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "yaml";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".sql")) return "sql";
  if (lower.endsWith(".sh") || lower.endsWith(".bash")) return "bash";
  if (lower.endsWith(".md")) return "markdown";
  return "typescript";
}

function uniqueLangs(primary: string): string[] {
  const chain: string[] = [primary];
  if (primary === "tsx") chain.push("typescript", "jsx");
  if (primary === "jsx") chain.push("javascript", "tsx");
  if (primary === "typescript") chain.push("tsx");
  if (primary === "javascript") chain.push("jsx");
  chain.push("plaintext");
  return [...new Set(chain)];
}

async function highlightOrPlaintext(code: string, primary: string): Promise<string> {
  for (const lang of uniqueLangs(primary)) {
    try {
      return await codeToHtml(code, { lang, theme: "github-dark" });
    } catch {
      /* try next */
    }
  }
  const escaped = code
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  return `<pre class="shiki github-dark plaintext-fallback" tabindex="0"><code>${escaped}</code></pre>`;
}

export function CodeDiff({ fix }: CodeDiffProps) {
  const lang = langFromPath(fix.file);
  const [beforeHtml, setBeforeHtml] = useState<string | null>(null);
  const [afterHtml, setAfterHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const [b, a] = await Promise.all([
        highlightOrPlaintext(fix.before, lang),
        highlightOrPlaintext(fix.after, lang),
      ]);
      if (!cancelled) {
        setBeforeHtml(b);
        setAfterHtml(a);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [fix.before, fix.after, lang]);

  if (!beforeHtml || !afterHtml) {
    return (
      <div className="my-4 rounded-lg border border-border bg-card">
        {fix.file && (
          <div className="border-b border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
            {fix.file}
            {fix.startLine != null && `:${fix.startLine}`}
            {fix.endLine != null && `–${fix.endLine}`}
          </div>
        )}
        <div className="grid min-h-32 gap-px bg-border md:grid-cols-2">
          <div className="animate-pulse bg-muted/60" />
          <div className="animate-pulse bg-muted/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-lg border border-border bg-card overflow-x-auto">
      {fix.file && (
        <div className="border-b border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
          {fix.file}
          {fix.startLine != null && `:${fix.startLine}`}
          {fix.endLine != null && `–${fix.endLine}`}
        </div>
      )}
      <div className="divide-y divide-border md:grid md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="min-w-0">
          <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:border-b">
            Current
          </div>
          <div className="overflow-x-auto text-xs [&_pre]:m-0 [&_pre]:max-h-none [&_pre]:min-h-0 [&_pre]:whitespace-pre [&_pre]:bg-transparent! [&_code]:block [&_.line]:block">
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: HTML from Shiki highlighter (trusted pipeline output) */}
            <div className="p-3" dangerouslySetInnerHTML={{ __html: beforeHtml }} />
          </div>
        </div>
        <div className="min-w-0">
          <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:border-b">
            Suggested
          </div>
          <div className="overflow-x-auto text-xs [&_pre]:m-0 [&_pre]:max-h-none [&_pre]:min-h-0 [&_pre]:whitespace-pre [&_pre]:bg-transparent! [&_code]:block [&_.line]:block">
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: HTML from Shiki highlighter (trusted pipeline output) */}
            <div className="p-3" dangerouslySetInnerHTML={{ __html: afterHtml }} />
          </div>
        </div>
      </div>
    </div>
  );
}
