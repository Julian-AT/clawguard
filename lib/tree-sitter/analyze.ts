import path from "node:path";
import * as TreeSitter from "web-tree-sitter";

type Language = TreeSitter.Language;
type Node = TreeSitter.Node;

let parserInit: Promise<void> | undefined;
let parserInstance: TreeSitter.Parser | undefined;

function getRepoRoot(): string {
  return process.cwd();
}

function wasmPath(filename: string): string {
  return path.join(getRepoRoot(), "node_modules", "tree-sitter-wasms", "out", filename);
}

function coreWasmPath(): string {
  return path.join(getRepoRoot(), "node_modules", "web-tree-sitter", "web-tree-sitter.wasm");
}

export async function ensureParser(): Promise<TreeSitter.Parser> {
  if (parserInstance) return parserInstance;
  if (!parserInit) {
    parserInit = TreeSitter.Parser.init({
      locateFile: (_scriptName: string, _dir: string) => coreWasmPath(),
    });
  }
  await parserInit;
  parserInstance = new TreeSitter.Parser();
  return parserInstance;
}

async function loadLanguageForPath(filePath: string): Promise<Language | null> {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();
  let wasmFile: string;
  if (base.endsWith(".tsx") || ext === ".tsx") {
    wasmFile = "tree-sitter-tsx.wasm";
  } else if (ext === ".ts" || ext === ".mts" || ext === ".cts") {
    wasmFile = "tree-sitter-typescript.wasm";
  } else if (ext === ".jsx") {
    wasmFile = "tree-sitter-javascript.wasm";
  } else if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
    wasmFile = "tree-sitter-javascript.wasm";
  } else if (ext === ".py") {
    wasmFile = "tree-sitter-python.wasm";
  } else if (ext === ".go") {
    wasmFile = "tree-sitter-go.wasm";
  } else if (ext === ".rs") {
    wasmFile = "tree-sitter-rust.wasm";
  } else {
    wasmFile = "tree-sitter-typescript.wasm";
  }

  try {
    return await TreeSitter.Language.load(wasmPath(wasmFile));
  } catch {
    return null;
  }
}

export interface FunctionMetric {
  name: string;
  startLine: number;
  endLine: number;
  parameters: number;
  cyclomaticComplexity: number;
  maxNestingDepth: number;
}

export interface CallEdge {
  from: string;
  to: string;
}

export interface AstAnalyzeResult {
  language: string;
  functions: FunctionMetric[];
  callEdges: CallEdge[];
  lineCount: number;
  errors?: string;
}

const DECISION_TYPES = new Set([
  "if_statement",
  "for_statement",
  "for_in_statement",
  "while_statement",
  "do_statement",
  "switch_statement",
  "catch_clause",
  "ternary_expression",
  "binary_expression", // only some — approximated below
]);

function maxDepth(node: Node, current: number, depthCap: number): number {
  if (current >= depthCap) return current;
  let max = current;
  for (let i = 0; i < node.childCount; i++) {
    const c = node.child(i);
    if (!c) continue;
    const d = maxDepth(c, current + 1, depthCap);
    if (d > max) max = d;
  }
  return max;
}

function cyclomaticApprox(node: Node): number {
  let complexity = 1;
  function walk(n: Node): void {
    if (DECISION_TYPES.has(n.type)) {
      complexity += 1;
    }
    if (n.type === "binary_expression") {
      const op = n.childForFieldName("operator");
      if (op && op.text === "&&") complexity += 1;
      if (op && op.text === "||") complexity += 1;
    }
    for (let i = 0; i < n.childCount; i++) {
      const c = n.child(i);
      if (c) walk(c);
    }
  }
  walk(node);
  return complexity;
}

function paramCount(node: Node): number {
  const params = node.childForFieldName("parameters");
  if (!params) return 0;
  let count = 0;
  for (let i = 0; i < params.childCount; i++) {
    const c = params.child(i);
    if (!c) continue;
    if (c.type === "," || c.type === "(" || c.type === ")") continue;
    count++;
  }
  return count;
}

function functionName(node: Node): string {
  const name = node.childForFieldName("name");
  if (name) return name.text;
  const id = node.descendantsOfType("identifier", node.startPosition, node.endPosition)[0];
  return id?.text ?? "(anonymous)";
}

export async function analyzeSourceCode(
  filePath: string,
  source: string,
): Promise<AstAnalyzeResult> {
  const lang = await loadLanguageForPath(filePath);
  if (!lang) {
    return {
      language: "unknown",
      functions: [],
      callEdges: [],
      lineCount: source.split("\n").length,
      errors: "Could not load tree-sitter grammar for this file type",
    };
  }

  const parser = await ensureParser();
  parser.setLanguage(lang);
  const tree = parser.parse(source);
  if (!tree) {
    return {
      language: lang.name ?? path.basename(filePath),
      functions: [],
      callEdges: [],
      lineCount: source.split("\n").length,
      errors: "Parser returned null tree",
    };
  }
  const root = tree.rootNode;

  const functions: FunctionMetric[] = [];
  const callEdges: CallEdge[] = [];
  const stack: string[] = [];

  function visitFunctionLike(node: Node, kind: string): void {
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    const name =
      kind === "arrow_function"
        ? stack.length
          ? `${stack[stack.length - 1]}:arrow`
          : "arrow"
        : functionName(node);
    stack.push(name);
    const depth = maxDepth(node, 0, 64);
    const cc = cyclomaticApprox(node);
    const pc = paramCount(node);
    functions.push({
      name,
      startLine,
      endLine,
      parameters: pc,
      cyclomaticComplexity: cc,
      maxNestingDepth: depth,
    });

    const walkCalls = (n: Node): void => {
      if (n.type === "call_expression") {
        const fn = n.childForFieldName("function");
        let callee = "?";
        if (fn?.type === "identifier") callee = fn.text;
        else if (fn?.type === "member_expression") {
          const prop = fn.childForFieldName("property");
          callee = prop?.text ?? fn.text;
        }
        callEdges.push({ from: name, to: callee });
      }
      for (let i = 0; i < n.childCount; i++) {
        const c = n.child(i);
        if (c) walkCalls(c);
      }
    };
    walkCalls(node);
    stack.pop();
  }

  function walk(node: Node): void {
    if (node.type === "function_declaration" || node.type === "generator_function_declaration") {
      visitFunctionLike(node, "function");
    } else if (node.type === "method_definition") {
      visitFunctionLike(node, "method");
    } else if (node.type === "arrow_function") {
      visitFunctionLike(node, "arrow_function");
    }
    for (let i = 0; i < node.childCount; i++) {
      const c = node.child(i);
      if (c) walk(c);
    }
  }
  walk(root);

  return {
    language: lang.name ?? path.basename(filePath),
    functions,
    callEdges,
    lineCount: source.split("\n").length,
  };
}
