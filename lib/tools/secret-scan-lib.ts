/**
 * Entropy + pattern-based secret hints for diffs (no ML).
 */

const HIGH_ENTROPY_MIN_LEN = 24;
const BASE64_RE = /^[A-Za-z0-9+/=/_-]{24,}$/;

const PATTERNS: Array<{ id: string; re: RegExp; label: string }> = [
  { id: "aws_access", re: /AKIA[0-9A-Z]{16}/, label: "Possible AWS access key id" },
  { id: "stripe_live", re: /sk_live_[a-z0-9]{20,}/i, label: "Possible Stripe live secret key" },
  { id: "github_pat", re: /ghp_[a-zA-Z0-9]{36}/, label: "GitHub personal access token" },
  { id: "github_oauth", re: /gho_[a-zA-Z0-9]{36}/, label: "GitHub OAuth token" },
  { id: "slack", re: /xox[baprs]-[0-9a-z-]{10,}/i, label: "Slack token" },
  { id: "private_key", re: /-----BEGIN [A-Z ]+PRIVATE KEY-----/, label: "Private key block" },
  {
    id: "generic_secret",
    re: /(?:api[_-]?key|secret|password|token)\s*[=:]\s*['"][^'"\s]{12,}['"]/i,
    label: "Assignment of secret-like value",
  },
];

function shannonEntropy(s: string): number {
  const freq = new Map<string, number>();
  for (const ch of s) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let ent = 0;
  const len = s.length;
  for (const c of freq.values()) {
    const p = c / len;
    ent -= p * Math.log2(p);
  }
  return ent;
}

export interface SecretScanHit {
  line: number;
  kind: "pattern" | "entropy";
  label: string;
  snippet: string;
}

export function scanDiffForSecrets(diff: string, maxHits = 40): SecretScanHit[] {
  const hits: SecretScanHit[] = [];
  const lines = diff.split(/\r?\n/);
  let lineNo = 0;
  for (const line of lines) {
    lineNo++;
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const content = line.slice(1);

    for (const { id, re, label } of PATTERNS) {
      if (re.test(content)) {
        hits.push({
          line: lineNo,
          kind: "pattern",
          label: `${label} (${id})`,
          snippet: content.slice(0, 200),
        });
      }
    }

    const trimmed = content.trim();
    if (trimmed.length >= HIGH_ENTROPY_MIN_LEN && BASE64_RE.test(trimmed)) {
      const ent = shannonEntropy(trimmed);
      if (ent > 4.2) {
        hits.push({
          line: lineNo,
          kind: "entropy",
          label: `High-entropy blob (entropy ${ent.toFixed(2)})`,
          snippet: `${trimmed.slice(0, 32)}…`,
        });
      }
    }
  }

  return hits.slice(0, maxHits);
}
