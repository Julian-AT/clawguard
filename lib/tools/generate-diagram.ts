import type { DepGraphResult } from "./dep-graph";

export type DiagramKind = "dependency" | "sequence";

export function mermaidDependencyGraph(graph: DepGraphResult, title?: string): string {
  const lines: string[] = ["graph LR"];
  if (title) {
    lines.push(`  title["${title.replace(/"/g, "'")}"]`);
  }
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 48);
  const seen = new Set<string>();
  for (const n of graph.nodes) {
    const id = safe(n.file);
    lines.push(`  ${id}["${n.file.split("/").pop() ?? n.file}"]`);
    for (const imp of n.imports) {
      const tid = safe(imp);
      const edge = `${id} --> ${tid}`;
      if (!seen.has(edge)) {
        seen.add(edge);
        lines.push(`  ${edge}`);
      }
    }
  }
  return lines.join("\n");
}

export function mermaidSequenceFromSteps(
  participants: string[],
  steps: Array<{ from: string; to: string; label: string }>,
): string {
  const lines = ["sequenceDiagram", "autonumber"];
  for (const p of participants) {
    const id = p.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32);
    lines.push(`  participant ${id} as ${p.slice(0, 40)}`);
  }
  const pid = (p: string) => p.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 32);
  for (const s of steps) {
    lines.push(`  ${pid(s.from)}->>${pid(s.to)}: ${s.label.replace(/"/g, "'").slice(0, 80)}`);
  }
  return lines.join("\n");
}
