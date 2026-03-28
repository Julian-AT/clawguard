import path from "node:path";

export interface ModuleNode {
  file: string;
  imports: string[];
  importedBy: string[];
}

export interface DepGraphResult {
  nodes: ModuleNode[];
  circularChains: string[][];
  fanOut: Record<string, number>;
}

function normalizeImport(fromFile: string, spec: string): string {
  if (spec.startsWith(".") || spec.startsWith("/")) {
    try {
      return path.normalize(path.join(path.dirname(fromFile), spec));
    } catch {
      return spec;
    }
  }
  return spec;
}

export function buildDepGraphFromImports(
  files: Array<{ path: string; importSpecs: string[] }>,
): DepGraphResult {
  const nodeMap = new Map<string, ModuleNode>();

  for (const f of files) {
    if (!nodeMap.has(f.path)) {
      nodeMap.set(f.path, { file: f.path, imports: [], importedBy: [] });
    }
    const n = nodeMap.get(f.path)!;
    const resolved = [...new Set(f.importSpecs.map((s) => normalizeImport(f.path, s)))];
    n.imports = resolved;
  }

  for (const n of nodeMap.values()) {
    for (const target of n.imports) {
      const key = [...nodeMap.keys()].find(
        (k) => k === target || k.endsWith(target) || target.endsWith(k),
      );
      if (key && nodeMap.has(key)) {
        nodeMap.get(key)!.importedBy.push(n.file);
      }
    }
  }

  const nodes = [...nodeMap.values()];
  const fanOut: Record<string, number> = {};
  for (const n of nodes) {
    fanOut[n.file] = n.imports.length;
  }

  const circularChains: string[][] = [];
  function dfs(
    start: string,
    current: string,
    visited: Set<string>,
    stack: string[],
  ): void {
    if (visited.has(current)) {
      if (current === start && stack.length > 1) {
        circularChains.push([...stack]);
      }
      return;
    }
    visited.add(current);
    stack.push(current);
    const node = nodeMap.get(current);
    if (node) {
      for (const imp of node.imports) {
        const key = [...nodeMap.keys()].find(
          (k) => k === imp || k.endsWith(imp) || imp.endsWith(k),
        );
        if (key) dfs(start, key, visited, stack);
      }
    }
    stack.pop();
    visited.delete(current);
  }

  for (const n of nodes) {
    dfs(n.file, n.file, new Set(), []);
  }

  return { nodes, circularChains: circularChains.slice(0, 8), fanOut };
}

/** Regex extraction of import specifiers (TS/JS). */
export function extractImportSpecifiers(source: string): string[] {
  const specs = new Set<string>();
  const importRe =
    /^import(?:\s+type)?\s+[\s\S]*?from\s+['"]([^'"]+)['"]/gm;
  const dynImportRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m: RegExpExecArray | null;
  m = importRe.exec(source);
  while (m !== null) {
    if (m[1]) specs.add(m[1]);
    m = importRe.exec(source);
  }
  m = dynImportRe.exec(source);
  while (m !== null) {
    if (m[1]) specs.add(m[1]);
    m = dynImportRe.exec(source);
  }
  m = requireRe.exec(source);
  while (m !== null) {
    if (m[1]) specs.add(m[1]);
    m = requireRe.exec(source);
  }
  return [...specs];
}
