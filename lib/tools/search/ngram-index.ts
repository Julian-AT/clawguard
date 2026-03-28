import type { Sandbox } from "@vercel/sandbox";

export interface SearchIndex {
  fileMap: Map<number, string>;
  postings: Map<number, Set<number>>;
  totalFiles: number;
}

/** Common character pairs in English + typical source — low weight (rare boundaries). */
const COMMON_PAIR_WEIGHTS: ReadonlyMap<string, number> = new Map(
  [
    "th",
    "he",
    "in",
    "er",
    "an",
    "re",
    "on",
    "at",
    "en",
    "nd",
    "te",
    "es",
    "or",
    "ti",
    "as",
    "to",
    "is",
    "ea",
    "st",
    "al",
    "nt",
    "de",
    "co",
    "ra",
    "io",
    "et",
    "it",
    "ar",
    "se",
    "le",
    "ou",
    "me",
    "ne",
    "be",
    "ma",
    "ve",
    "li",
    "ri",
    "ro",
    "ic",
    "om",
    "ac",
    "il",
    "tr",
    "ss",
    "so",
    "ci",
    "el",
    "ex",
    "fo",
    "pr",
    "no",
    "do",
    "if",
    "wh",
    "ch",
    "sh",
    "ge",
    "ly",
    "ty",
    "ry",
    "py",
    "js",
    "ts",
    "//",
    "  ",
    " (",
    ") ",
    "{ ",
    " }",
    "; ",
    ", ",
    ": ",
    "= ",
    " =",
    "=>",
    "::",
    "->",
    "[]",
    "()",
    "\n\t",
    "\t ",
    " \n",
    ' "',
    '" ',
    " '",
    "' ",
  ].map((pair, i) => [pair, 20 + (i % 80)]),
);

/**
 * Pair weight: low for frequent digrams, higher for rare pairs (sparse boundaries).
 * Unknown pairs use a CRC32-style mix in a higher band so they tend to win locally.
 */
function pairWeight(a: number, b: number): number {
  const key = String.fromCharCode(a, b);
  const common = COMMON_PAIR_WEIGHTS.get(key);
  if (common !== undefined) return common;

  let h = (a * 31 + b) >>> 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return 400 + (h & 0x3fff);
}

export function hashNgram(ngram: string): number {
  let h = 0;
  for (let i = 0; i < ngram.length; i++) {
    h = ((h << 5) - h + ngram.charCodeAt(i)) | 0;
  }
  return h;
}

export function extractSparseNgrams(text: string): string[] {
  if (text.length < 3) return text.length > 0 ? [text] : [];

  const weights: number[] = [];
  for (let i = 0; i < text.length - 1; i++) {
    weights.push(pairWeight(text.charCodeAt(i), text.charCodeAt(i + 1)));
  }

  const ngrams: string[] = [];
  let start = 0;

  for (let i = 1; i < weights.length; i++) {
    let isLocalMax = true;
    for (let j = start; j < i; j++) {
      if (weights[j] >= weights[i]) {
        isLocalMax = false;
        break;
      }
    }

    if (isLocalMax && i - start >= 2) {
      const end = i + 2 > text.length ? text.length : i + 2;
      ngrams.push(text.slice(start, end));
      start = i;
    }
  }

  if (start < text.length) {
    const final = text.slice(start);
    if (final.length >= 2) ngrams.push(final);
  }

  return ngrams;
}

/** Minimal n-grams needed to match a literal query (covering). */
export function extractCoveringNgrams(query: string): string[] {
  if (query.length < 3) return query.length > 0 ? [query] : [];

  const weights: number[] = [];
  for (let i = 0; i < query.length - 1; i++) {
    weights.push(pairWeight(query.charCodeAt(i), query.charCodeAt(i + 1)));
  }

  const boundaries: number[] = [0];
  for (let i = 1; i < weights.length - 1; i++) {
    if (weights[i] > weights[i - 1] && weights[i] >= weights[i + 1]) {
      boundaries.push(i);
    }
  }
  boundaries.push(query.length - 1);

  const ngrams: string[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const s = boundaries[i];
    const e = Math.min(boundaries[i + 1] + 2, query.length);
    const ng = query.slice(s, e);
    if (ng.length >= 2) ngrams.push(ng);
  }

  return [...new Set(ngrams)];
}

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".lock",
]);

export async function buildSearchIndex(sandbox: Sandbox): Promise<SearchIndex> {
  const fileMap = new Map<number, string>();
  const postings = new Map<number, Set<number>>();

  const findResult = await sandbox.runCommand("find", [
    ".",
    "-type",
    "f",
    "-not",
    "-path",
    "*/node_modules/*",
    "-not",
    "-path",
    "*/.git/*",
    "-not",
    "-path",
    "*/.next/*",
    "-not",
    "-path",
    "*/dist/*",
    "-not",
    "-path",
    "*/build/*",
    "-not",
    "-path",
    "*/.cache/*",
  ]);

  const stdout = await findResult.stdout();
  const paths = stdout.split("\n").filter((p) => {
    if (!p || p === ".") return false;
    const dot = p.lastIndexOf(".");
    const ext = dot >= 0 ? p.slice(dot) : "";
    return !BINARY_EXTENSIONS.has(ext);
  });

  let fileId = 0;
  for (const path of paths.slice(0, 10_000)) {
    const cleanPath = path.startsWith("./") ? path.slice(2) : path;
    try {
      const buf = await sandbox.readFileToBuffer({ path: cleanPath });
      if (!buf || buf.length > 1_000_000) continue;

      const text = buf.toString("utf-8");
      const id = fileId++;
      fileMap.set(id, cleanPath);

      const ngrams = extractSparseNgrams(text);
      for (const ng of ngrams) {
        const h = hashNgram(ng);
        let set = postings.get(h);
        if (!set) {
          set = new Set();
          postings.set(h, set);
        }
        set.add(id);
      }
    } catch {
      // skip unreadable files
    }
  }

  return { fileMap, postings, totalFiles: fileId };
}
