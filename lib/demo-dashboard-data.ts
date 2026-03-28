import type { AuditTableRow } from "@/components/data-table";
import type { KnowledgeEntry } from "@/lib/knowledge/types";
import type { Learning } from "@/lib/learnings/types";

/** ~30 days of average audit scores for the overview chart */
export const demoAuditSeries: { date: string; score: number }[] = (() => {
  const out: { date: string; score: number }[] = [];
  const base = new Date();
  base.setUTCDate(base.getUTCDate() - 29);
  const scores = [
    71, 74, 76, 78, 79, 81, 80, 82, 83, 82, 84, 85, 84, 86, 85, 87, 86, 88, 87, 89, 88, 90, 89, 91,
    90, 88, 87, 86, 85, 82,
  ];
  for (let i = 0; i < 30; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    out.push({
      date: d.toISOString().slice(0, 10),
      score: scores[i] ?? 80,
    });
  }
  return out;
})();

export const demoAuditTableRows: AuditTableRow[] = [
  {
    id: "demo/acme-api/pr/412",
    owner: "acme",
    repo: "api-gateway",
    prNumber: 412,
    title: "Harden JWT validation and refresh rotation",
    status: "complete",
    score: 88,
    grade: "B",
    criticalCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "demo/acme-web/pr/891",
    owner: "acme",
    repo: "web-app",
    prNumber: 891,
    title: "Fix XSS in markdown renderer (sanitizer)",
    status: "complete",
    score: 92,
    grade: "A",
    criticalCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "demo/payments/pr/203",
    owner: "acme",
    repo: "payments",
    prNumber: 203,
    title: "PCI: scope card data out of logs",
    status: "complete",
    score: 76,
    grade: "C",
    criticalCount: 1,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: "demo/julian-at-clawguard/pr/44",
    owner: "julian-at",
    repo: "clawguard",
    prNumber: 44,
    title: "Add rate limiting to public API routes",
    status: "complete",
    score: 85,
    grade: "B",
    criticalCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
  },
  {
    id: "demo/acme-api/pr/408",
    owner: "acme",
    repo: "api-gateway",
    prNumber: 408,
    title: "Dependency bump: openssl transitive",
    status: "complete",
    score: 81,
    grade: "B",
    criticalCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: "demo/acme-infra/pr/120",
    owner: "acme",
    repo: "infra",
    prNumber: 120,
    title: "Terraform: tighten S3 bucket policies",
    status: "complete",
    score: 79,
    grade: "C",
    criticalCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
  {
    id: "demo/acme-web/pr/885",
    owner: "acme",
    repo: "web-app",
    prNumber: 885,
    title: "CSP: allow inline for legacy widget (temporary)",
    status: "complete",
    score: 68,
    grade: "D",
    criticalCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
  {
    id: "demo/payments/pr/198",
    owner: "acme",
    repo: "payments",
    prNumber: 198,
    title: "Webhook signature verification",
    status: "complete",
    score: 94,
    grade: "A",
    criticalCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
  },
];

export const demoRepoTrendChart: { label: string; score: number }[] = [
  { label: "PR #38", score: 72 },
  { label: "PR #39", score: 78 },
  { label: "PR #40", score: 81 },
  { label: "PR #41", score: 79 },
  { label: "PR #42", score: 84 },
  { label: "PR #44", score: 85 },
];

/** Completed audits for the repo dashboard table (newest first) */
export const demoRepoPrRows: {
  pr: number;
  title: string;
  score: number;
  grade: string;
  timestamp: string;
  findings: number;
}[] = [
  {
    pr: 44,
    title: "Add rate limiting to public API routes",
    score: 85,
    grade: "B",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    findings: 5,
  },
  {
    pr: 42,
    title: "Harden session cookie SameSite",
    score: 84,
    grade: "B",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString(),
    findings: 3,
  },
  {
    pr: 41,
    title: "Refactor auth middleware chain",
    score: 79,
    grade: "C",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 110).toISOString(),
    findings: 7,
  },
  {
    pr: 40,
    title: "OpenAPI: document error responses",
    score: 81,
    grade: "B",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 140).toISOString(),
    findings: 2,
  },
  {
    pr: 39,
    title: "Bump dependencies (security patches)",
    score: 78,
    grade: "C",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
    findings: 4,
  },
  {
    pr: 38,
    title: "Initial ClawGuard baseline scan",
    score: 72,
    grade: "C",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 260).toISOString(),
    findings: 12,
  },
];

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

export const demoOrgLearnings: Learning[] = [
  {
    id: "l-org-1",
    pattern: "Prefer parameterized queries for all ORM-adjacent SQL",
    context:
      "Repeated feedback on raw string concatenation in reporting queries; team agreed to lint and review.",
    action: "prefer",
    sourcePr: 412,
    confidence: 0.92,
    upvotes: 4,
    createdAt: iso(21),
    updatedAt: iso(21),
  },
  {
    id: "l-org-2",
    pattern: "Suppress log4j-style noise on vendored /third_party paths",
    context: "Scanner flags legacy vendor tree; not actionable in this repo.",
    action: "suppress",
    sourcePr: 198,
    confidence: 0.78,
    upvotes: 2,
    createdAt: iso(35),
    updatedAt: iso(35),
  },
  {
    id: "l-org-3",
    pattern: "Escalate any change touching auth/session cookie flags",
    context: "Two incidents in staging; security review required before merge.",
    action: "escalate",
    sourcePr: 891,
    confidence: 0.88,
    upvotes: 6,
    createdAt: iso(14),
    updatedAt: iso(14),
  },
  {
    id: "l-org-4",
    pattern: "Public API routes must declare rate limits in OpenAPI",
    context: "Aligns with API gateway policy and audit expectations.",
    action: "prefer",
    sourcePr: 44,
    confidence: 0.85,
    upvotes: 3,
    createdAt: iso(10),
    updatedAt: iso(10),
  },
];

export const demoRepoLearnings: Learning[] = [
  {
    id: "l-repo-1",
    pattern: "Next.js middleware: validate origin on state-changing requests",
    context: "CSRF-style issues when same-site cookies used with cross-origin embeds.",
    action: "prefer",
    sourcePr: 44,
    confidence: 0.81,
    upvotes: 2,
    createdAt: iso(8),
    updatedAt: iso(8),
  },
  {
    id: "l-repo-2",
    pattern: "Suppress 'missing helmet' on static asset-only routes",
    context: "False positive for /_next/static responses.",
    action: "suppress",
    sourcePr: 40,
    confidence: 0.72,
    upvotes: 1,
    createdAt: iso(18),
    updatedAt: iso(18),
  },
];

export const demoKnowledgeEntries: KnowledgeEntry[] = [
  {
    id: "k-1",
    category: "pattern",
    title: "API keys only via OIDC / workload identity in prod",
    body: "No long-lived secrets in env for batch jobs; use provider-native identity.",
    sourceRepos: ["clawguard", "api-gateway", "payments"],
    confidence: 0.9,
    createdAt: iso(60),
  },
  {
    id: "k-2",
    category: "anti-pattern",
    title: "Storing PII in client-accessible JWT claims",
    body: "Claims should be identifiers only; fetch sensitive attributes server-side.",
    sourceRepos: ["clawguard", "web-app", "api-gateway"],
    confidence: 0.94,
    createdAt: iso(45),
  },
  {
    id: "k-3",
    category: "adr",
    title: "ADR-014: Event bus for domain notifications (not direct DB polling)",
    body: "Reduces coupling and improves traceability for security-relevant events.",
    sourceRepos: ["payments"],
    confidence: 0.86,
    createdAt: iso(90),
  },
  {
    id: "k-4",
    category: "pattern",
    title: "Content-Security-Policy baseline for marketing + app shells",
    body: "Separate CSP for static marketing site vs authenticated app to limit breakage.",
    sourceRepos: ["web-app"],
    confidence: 0.79,
    createdAt: iso(30),
  },
  {
    id: "k-5",
    category: "pattern",
    title: "IaC: deny-by-default security groups; document exceptions",
    body: "Each ingress rule needs ticket reference in Terraform comment.",
    sourceRepos: ["infra"],
    confidence: 0.83,
    createdAt: iso(120),
  },
];

export const demoTracking = {
  truePositives: 34,
  falsePositives: 7,
  misses: 4,
  lastUpdated: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
};
