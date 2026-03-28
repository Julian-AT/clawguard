import type { StoredPrediction } from "./predictions";

/**
 * Heuristic: does an issue text reference a prior finding fingerprint?
 * Returns confidence 0–1 for metrics / auto-learning.
 */
export function correlateIssueToPrediction(
  issueTitle: string,
  issueBody: string,
  prediction: StoredPrediction,
): number {
  const text = `${issueTitle}\n${issueBody}`.toLowerCase();
  if (text.length < 10) return 0;

  let hits = 0;
  for (const fp of prediction.fingerprints) {
    const filePart = fp.file.split("/").pop()?.toLowerCase() ?? "";
    if (filePart && text.includes(filePart)) hits += 0.35;
    const typeTok = fp.type.toLowerCase().slice(0, 24);
    if (typeTok && text.includes(typeTok)) hits += 0.25;
    if (text.includes(fp.file.toLowerCase())) hits += 0.2;
  }
  return Math.min(1, hits);
}
