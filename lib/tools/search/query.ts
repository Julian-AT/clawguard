import type { Sandbox } from "@vercel/sandbox";
import type { SearchIndex } from "./ngram-index";
import { extractCoveringNgrams, hashNgram } from "./ngram-index";

export interface SearchMatch {
  file: string;
  line: number;
  content: string;
}

export interface SearchResult {
  matches: SearchMatch[];
  candidateFiles: number;
  totalFiles: number;
  indexUsed: boolean;
}

function getCandidateFiles(index: SearchIndex, query: string): Set<number> | null {
  const ngrams = extractCoveringNgrams(query);
  if (ngrams.length === 0) return null;

  let candidates: Set<number> | null = null;

  for (const ng of ngrams) {
    const h = hashNgram(ng);
    const posting = index.postings.get(h);

    if (!posting) return new Set();

    if (candidates === null) {
      candidates = new Set(posting);
    } else {
      for (const id of [...candidates]) {
        if (!posting.has(id)) candidates.delete(id);
      }
    }

    if (candidates.size === 0) return candidates;
  }

  return candidates;
}

function parseRgJsonLine(line: string): SearchMatch | null {
  if (!line.trim()) return null;
  try {
    const entry = JSON.parse(line) as {
      type?: string;
      data?: {
        path?: { text?: string };
        line_number?: number;
        lines?: { text?: string };
      };
    };
    if (entry.type === "match" && entry.data) {
      return {
        file: entry.data.path?.text ?? "",
        line: entry.data.line_number ?? 0,
        content: entry.data.lines?.text?.trimEnd() ?? "",
      };
    }
  } catch {
    return null;
  }
  return null;
}

export async function searchWithIndex(
  sandbox: Sandbox,
  index: SearchIndex,
  pattern: string,
  options?: {
    maxResults?: number;
    caseSensitive?: boolean;
    fileGlob?: string;
    useRegex?: boolean;
  }
): Promise<SearchResult> {
  const maxResults = options?.maxResults ?? 50;
  const caseSensitive = options?.caseSensitive ?? true;
  const useRegex = options?.useRegex ?? false;

  const isLiteral =
    !useRegex && !/[.*+?^${}()|[\]\\]/.test(pattern);

  let candidateSet: Set<number> | null = null;
  let indexUsed = false;
  let reportingCandidates = index.totalFiles;
  let narrowedPaths: string[] | undefined;

  if (isLiteral && caseSensitive) {
    candidateSet = getCandidateFiles(index, pattern);
    indexUsed = candidateSet !== null;

    if (indexUsed && candidateSet && candidateSet.size === 0) {
      return {
        matches: [],
        candidateFiles: 0,
        totalFiles: index.totalFiles,
        indexUsed: true,
      };
    }

    if (
      indexUsed &&
      candidateSet &&
      candidateSet.size > 0 &&
      candidateSet.size < 200
    ) {
      narrowedPaths = [...candidateSet]
        .map((id) => index.fileMap.get(id))
        .filter((p): p is string => Boolean(p));
      reportingCandidates = candidateSet.size;
    } else if (indexUsed && candidateSet && candidateSet.size >= 200) {
      indexUsed = false;
      reportingCandidates = index.totalFiles;
      narrowedPaths = undefined;
      candidateSet = null;
    }
  }

  const args = ["--json", "--max-count", String(maxResults)];
  if (!caseSensitive) args.push("-i");
  if (options?.fileGlob) args.push("--glob", options.fileGlob);
  args.push("--", pattern);
  if (narrowedPaths?.length) {
    args.push(...narrowedPaths);
  }

  const result = await sandbox.runCommand("rg", args);
  const stdout = await result.stdout();
  const stderr = await result.stderr();

  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(stderr.trim() || `ripgrep exited with code ${result.exitCode}`);
  }

  const matches: SearchMatch[] = [];
  for (const line of stdout.split("\n")) {
    const m = parseRgJsonLine(line);
    if (m) {
      matches.push(m);
      if (matches.length >= maxResults) break;
    }
  }

  return {
    matches,
    candidateFiles: reportingCandidates,
    totalFiles: index.totalFiles,
    indexUsed,
  };
}
