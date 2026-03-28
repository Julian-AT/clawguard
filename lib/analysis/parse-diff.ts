/**
 * Structured unified diff parse (no external deps).
 */

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  /** Lines prefixed with space (context) */
  contextLines: string[];
  /** Added lines (without leading +) */
  additions: string[];
  /** Removed lines (without leading -) */
  deletions: string[];
}

export interface ParsedDiffFile {
  path: string;
  oldPath?: string;
  hunks: DiffHunk[];
}

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export function parseUnifiedDiff(diff: string): { files: ParsedDiffFile[] } {
  const files: ParsedDiffFile[] = [];
  const lines = diff.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const gitMatch = lines[i].match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (!gitMatch) {
      i++;
      continue;
    }
    const path = gitMatch[2];
    i++;
    let oldPath: string | undefined;
    const hunks: DiffHunk[] = [];

    while (i < lines.length && !lines[i].startsWith("diff --git ")) {
      const l = lines[i];
      if (l.startsWith("--- a/")) {
        oldPath = l.slice(6);
      } else if (l.startsWith("--- ")) {
        const raw = l.slice(4).trim();
        if (raw !== "/dev/null") oldPath = raw.replace(/^a\//, "");
      }

      const hm = l.match(HUNK_RE);
      if (hm) {
        const oldStart = Number.parseInt(hm[1], 10);
        const oldLineCount = hm[2] ? Number.parseInt(hm[2], 10) : 1;
        const newStart = Number.parseInt(hm[3], 10);
        const newLineCount = hm[4] ? Number.parseInt(hm[4], 10) : 1;
        i++;
        const contextLines: string[] = [];
        const additions: string[] = [];
        const deletions: string[] = [];
        while (i < lines.length) {
          const hl = lines[i];
          if (hl.startsWith("diff --git ")) break;
          if (HUNK_RE.test(hl)) break;
          if (hl.startsWith("--- ") || hl.startsWith("+++ ")) break;
          if (hl.startsWith("\\")) {
            i++;
            continue;
          }
          if (hl.startsWith("+")) {
            additions.push(hl.slice(1));
          } else if (hl.startsWith("-")) {
            deletions.push(hl.slice(1));
          } else if (hl.startsWith(" ") || hl === "") {
            contextLines.push(hl === "" ? "" : hl.slice(1));
          }
          i++;
        }
        hunks.push({
          oldStart,
          oldLines: oldLineCount,
          newStart,
          newLines: newLineCount,
          contextLines,
          additions,
          deletions,
        });
        continue;
      }
      i++;
    }

    files.push({ path, oldPath, hunks });
  }

  return { files };
}
