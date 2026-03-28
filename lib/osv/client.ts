/**
 * OSV API client (https://google.github.io/osv.dev/)
 */

export interface OsvPackageQuery {
  name: string;
  version: string;
  ecosystem: string;
}

export interface OsvVulnSummary {
  id: string;
  summary?: string;
  modified?: string;
  /** Severity strings when present in OSV */
  severity?: Array<{ type?: string; score?: string }>;
}

export interface OsvBatchResult {
  results: Array<{ results?: OsvVulnSummary[] }>;
}

export async function osvQueryBatch(queries: OsvPackageQuery[]): Promise<OsvBatchResult> {
  const res = await fetch("https://api.osv.dev/v1/querybatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      queries: queries.map((q) => ({
        package: { name: q.name, ecosystem: q.ecosystem },
        version: q.version,
      })),
    }),
  });
  if (!res.ok) {
    throw new Error(`OSV batch failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as OsvBatchResult;
}
