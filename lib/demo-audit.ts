import { getGrade } from "@/lib/analysis/scoring";

/** Headline score for this static fixture: raw `calculateScore` over all detailed findings hits ~0; we pin a D-grade for a realistic “request changes” demo. */
const DEMO_SHOWCASE_SCORE = 61;

import { type AuditResult, type Finding, parseAuditResult } from "@/lib/analysis/types";
import type { AuditData } from "@/lib/audit-data";

/** Redis key for the seeded showcase (see `npm run seed:demo-audit`). */
export const DEMO_AUDIT_KEY = "demo/clawguard-showcase/pr/1";

function buildFindings(): Finding[] {
  return [
    // --- code-quality phase (non-security categories) ---
    {
      id: "demo-q-1",
      category: "quality",
      severity: "LOW",
      type: "complexity",
      title: "Nested conditionals in checkout handler",
      file: "app/api/checkout/route.ts",
      line: 44,
      description:
        "The POST handler nests four conditionals; early returns would reduce cognitive load and simplify testing.",
      confidence: "MEDIUM",
      remediationEffort: "trivial",
    },
    {
      id: "demo-q-2",
      category: "quality",
      severity: "MEDIUM",
      type: "maintainability",
      title: "Duplicate input validation",
      file: "app/api/checkout/route.ts",
      line: 18,
      description:
        "Email and amount validation mirror logic in `lib/validation/checkout.ts` — DRY into shared helpers to avoid drift.",
      confidence: "HIGH",
      remediationEffort: "small",
    },
    {
      id: "demo-a-1",
      category: "architecture",
      severity: "HIGH",
      type: "layering",
      title: "Business rules embedded in the route handler",
      file: "app/api/checkout/route.ts",
      line: 22,
      description:
        "Discount and tax rules live inline in the API layer; moving them to a domain module improves testability and reuse.",
      confidence: "HIGH",
      remediationEffort: "medium",
    },
    {
      id: "demo-d-1",
      category: "documentation",
      severity: "LOW",
      type: "api-docs",
      title: "Public POST handler lacks request/response documentation",
      file: "app/api/checkout/route.ts",
      line: 1,
      description:
        "No OpenAPI or JSDoc describes error shapes or idempotency expectations for integrators.",
      confidence: "MEDIUM",
      remediationEffort: "small",
    },
    {
      id: "demo-p-1",
      category: "performance",
      severity: "LOW",
      type: "data-access",
      title: "Sequential awaits in order summary",
      file: "lib/db/orders.ts",
      line: 28,
      description:
        "Order lines and customer profile are loaded with back-to-back awaits; `Promise.all` would cut latency on hot paths.",
      confidence: "MEDIUM",
      remediationEffort: "small",
    },
    // --- vulnerability-scan phase ---
    {
      id: "demo-sqli",
      category: "security",
      severity: "CRITICAL",
      type: "sql-injection",
      title: "SQL built from string concatenation",
      file: "lib/db/orders.ts",
      line: 12,
      cweId: "CWE-89",
      owaspCategory: "A03:2021 — Injection",
      description:
        "Order ID from the request is interpolated into a SQL string. Use parameterized queries or an ORM.",
      attackScenario:
        "An attacker could pass `'1' OR '1'='1'` as the order id and read arbitrary rows from the orders table.",
      confidence: "HIGH",
      strideCategory: "T",
      dataFlow: {
        nodes: [
          { label: "request JSON (orderId)", type: "source" },
          { label: "interpolated SQL string", type: "transform" },
          { label: "db.query()", type: "sink" },
        ],
        mermaidDiagram: `flowchart LR
  A[orderId from request] --> B[SQL string]
  B --> C[(PostgreSQL)]`,
      },
      fix: {
        before: `export async function getOrder(id: string) {
  return db.query(\`SELECT * FROM orders WHERE id = '\${id}'\`);
}`,
        after: `export async function getOrder(id: string) {
  return db.query("SELECT * FROM orders WHERE id = $1", [id]);
}`,
        file: "lib/db/orders.ts",
        startLine: 10,
        endLine: 14,
        explanation:
          "Bind the id as a parameter so the driver escapes it; never concatenate SQL input.",
      },
      complianceMapping: {
        pciDss: ["6.5.1"],
        soc2: ["CC6.1"],
        hipaa: ["164.312(a)(1)"],
        nist: ["SI-10"],
        owaspAsvs: ["5.3.4"],
      },
      remediationEffort: "small",
    },
    {
      id: "demo-secret",
      category: "security",
      severity: "HIGH",
      type: "hardcoded-secret",
      title: "Production API key committed in env helper",
      file: "lib/env.ts",
      line: 14,
      cweId: "CWE-798",
      owaspCategory: "A02:2021 — Cryptographic Failures",
      description:
        "A live-looking payment provider key is embedded as a fallback when `PAYMENTS_API_KEY` is unset.",
      attackScenario:
        "Anyone with clone access can use the key to create or refund charges against your merchant account.",
      confidence: "HIGH",
      strideCategory: "I",
      dataFlow: {
        nodes: [
          { label: "Literal in source", type: "source" },
          { label: "getEnv()", type: "transform" },
          { label: "fetch() Authorization", type: "sink" },
        ],
      },
      fix: {
        before: `export const paymentsKey =
  process.env.PAYMENTS_API_KEY ?? "sk_live_demo_replaceme";`,
        after: `export const paymentsKey = requireEnv("PAYMENTS_API_KEY");`,
        file: "lib/env.ts",
        startLine: 12,
        endLine: 15,
      },
      complianceMapping: {
        pciDss: ["6.5.3", "8.2.1"],
        soc2: ["CC6.1"],
        hipaa: ["164.312(a)(2)(iv)"],
        nist: ["SC-12", "SC-13"],
        owaspAsvs: ["2.10.4", "6.4.1"],
      },
      remediationEffort: "small",
    },
    {
      id: "demo-xss",
      category: "security",
      severity: "HIGH",
      type: "xss",
      title: "HTML email template renders unsanitized user fields",
      file: "lib/email/receipt.tsx",
      line: 36,
      cweId: "CWE-79",
      owaspCategory: "A03:2021 — Injection",
      description:
        "`dangerouslySetInnerHTML` is fed a string that includes the shipping name from the database without escaping.",
      attackScenario:
        "A user sets their display name to a script payload; when a receipt is rendered server-side, it executes in mail clients that execute HTML.",
      confidence: "HIGH",
      strideCategory: "T",
      fix: {
        before: `<div dangerouslySetInnerHTML={{ __html: bodyHtml }} />`,
        after: `<div>{sanitizeHtml(bodyHtml)} />`,
        file: "lib/email/receipt.tsx",
        startLine: 34,
        endLine: 37,
      },
      complianceMapping: {
        pciDss: ["6.5.7"],
        soc2: ["CC6.1"],
        hipaa: [],
        nist: ["SI-10"],
        owaspAsvs: ["5.3.3"],
      },
      remediationEffort: "small",
    },
    {
      id: "demo-ratelimit",
      category: "security",
      severity: "HIGH",
      type: "weak-auth-controls",
      title: "Login route has no rate limiting",
      file: "app/api/auth/login/route.ts",
      line: 9,
      cweId: "CWE-307",
      owaspCategory: "A07:2021 — Identification and Authentication Failures",
      description:
        "The credential check endpoint accepts unbounded attempts with no delay, CAPTCHA, or lockout.",
      attackScenario:
        "An attacker runs a credential-stuffing list against the endpoint from distributed IPs until a password matches.",
      confidence: "HIGH",
      strideCategory: "D",
      fix: {
        before: `export async function POST(req: Request) {`,
        after: `export const POST = withRateLimit({ id: "login", max: 10, windowSec: 300 }, async (req) => {`,
        file: "app/api/auth/login/route.ts",
        startLine: 8,
        endLine: 11,
      },
      complianceMapping: {
        pciDss: ["6.5.10", "8.1.6"],
        soc2: ["CC6.1"],
        hipaa: [],
        nist: ["AC-7"],
        owaspAsvs: ["2.2.1"],
      },
      remediationEffort: "medium",
    },
    {
      id: "demo-csrf",
      category: "security",
      severity: "MEDIUM",
      type: "csrf",
      title: "State-changing POST without CSRF protection",
      file: "app/api/checkout/route.ts",
      line: 31,
      cweId: "CWE-352",
      owaspCategory: "A01:2021 — Broken Access Control",
      description:
        "Checkout accepts POST from a browser session cookie but does not validate a CSRF token or same-site policy for the mutation.",
      attackScenario:
        "A malicious site tricks a logged-in victim into submitting a forged checkout to ship goods to an attacker-controlled address.",
      confidence: "MEDIUM",
      strideCategory: "S",
      remediationEffort: "medium",
    },
    {
      id: "demo-path",
      category: "security",
      severity: "MEDIUM",
      type: "path-traversal",
      title: "Export path joins user input without normalization",
      file: "app/api/exports/[id]/route.ts",
      line: 22,
      cweId: "CWE-22",
      owaspCategory: "A01:2021 — Broken Access Control",
      description:
        "`path.join` is called with a segment from the client without `path.basename` or root confinement.",
      attackScenario:
        "An attacker requests `../../../etc/passwd` as the logical export id and reads files outside the export directory.",
      confidence: "HIGH",
      strideCategory: "T",
      fix: {
        before: `const target = path.join(EXPORT_ROOT, id);`,
        after: `const safe = path.basename(id);
const target = path.join(EXPORT_ROOT, safe);`,
        file: "app/api/exports/[id]/route.ts",
        startLine: 20,
        endLine: 24,
      },
      complianceMapping: {
        pciDss: ["6.5.8"],
        soc2: ["CC6.1"],
        hipaa: [],
        nist: ["SI-10"],
        owaspAsvs: ["12.3.1"],
      },
      remediationEffort: "small",
    },
    {
      id: "demo-ssrf",
      category: "security",
      severity: "MEDIUM",
      type: "ssrf",
      title: "Webhook dispatcher fetches user-supplied URL",
      file: "app/api/webhooks/dispatch/route.ts",
      line: 41,
      cweId: "CWE-918",
      owaspCategory: "A10:2021 — Server-Side Request Forgery",
      description:
        "The retry worker loads `targetUrl` from the job payload and issues a server-side GET without an allowlist.",
      attackScenario:
        "An attacker queues a job pointing at `http://169.254.169.254/` to reach cloud metadata and steal instance credentials.",
      confidence: "HIGH",
      strideCategory: "I",
      remediationEffort: "medium",
    },
    {
      id: "demo-headers",
      category: "security",
      severity: "LOW",
      type: "misconfiguration",
      title: "API responses omit key security headers",
      file: "middleware.ts",
      line: 12,
      cweId: "CWE-693",
      owaspCategory: "A05:2021 — Security Misconfiguration",
      description:
        "Responses do not consistently set `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`.",
      attackScenario:
        "MIME sniffing or referrer leakage makes downstream XSS or data exfiltration easier in edge cases.",
      confidence: "MEDIUM",
      fix: {
        before: `const res = NextResponse.next();`,
        after: `const res = NextResponse.next();
res.headers.set("X-Content-Type-Options", "nosniff");`,
        file: "middleware.ts",
        startLine: 10,
        endLine: 14,
      },
      complianceMapping: {
        pciDss: [],
        soc2: ["CC6.1"],
        hipaa: [],
        nist: ["SC-8"],
        owaspAsvs: ["14.4.3"],
      },
      remediationEffort: "trivial",
    },
    {
      id: "demo-log",
      category: "security",
      severity: "INFO",
      type: "sensitive-logging",
      title: "PII written to stdout in production path",
      file: "lib/auth/session.ts",
      line: 55,
      cweId: "CWE-532",
      owaspCategory: "A09:2021 — Security Logging and Monitoring Failures",
      description:
        "Failed session lookups log the raw session cookie prefix — useful for debugging, risky in centralized logs.",
      attackScenario:
        "Operators or an attacker with log access can correlate sessions to users more easily than intended.",
      confidence: "MEDIUM",
      remediationEffort: "trivial",
    },
    // --- threat-model phase (testing + residual risk) ---
    {
      id: "demo-t-1",
      category: "testing",
      severity: "MEDIUM",
      type: "coverage-gap",
      title: "No automated test for payment failure rollback",
      file: "app/api/checkout/route.ts",
      line: 1,
      description:
        "The charge + order insert path has no integration test that asserts DB state when the PSP returns 402.",
      confidence: "HIGH",
      remediationEffort: "medium",
    },
    {
      id: "demo-tm-1",
      category: "security",
      severity: "MEDIUM",
      type: "idor",
      title: "Admin export list omits org scoping check",
      file: "app/api/admin/exports/route.ts",
      line: 17,
      cweId: "CWE-639",
      owaspCategory: "A01:2021 — Broken Access Control",
      description:
        'The handler verifies `role === "admin"` but does not constrain `orgId` to the caller\'s organization.',
      attackScenario:
        "A compromised admin account in org A lists and downloads export jobs from org B by changing a query parameter.",
      confidence: "MEDIUM",
      strideCategory: "E",
      remediationEffort: "small",
    },
  ];
}

function buildDemoAuditResult(): AuditResult {
  const allFindings = buildFindings();
  const score = DEMO_SHOWCASE_SCORE;
  const grade = getGrade(score);

  const codeQualityFindings = allFindings.filter(
    (f) =>
      f.category === "quality" ||
      f.category === "architecture" ||
      f.category === "documentation" ||
      f.category === "performance",
  );
  const vulnFindings = allFindings.filter(
    (f) =>
      f.category === "security" &&
      [
        "demo-sqli",
        "demo-secret",
        "demo-xss",
        "demo-ratelimit",
        "demo-csrf",
        "demo-path",
        "demo-ssrf",
        "demo-headers",
        "demo-log",
      ].includes(f.id ?? ""),
  );
  const threatPhaseFindings = allFindings.filter(
    (f) => f.id === "demo-t-1" || f.id === "demo-tm-1",
  );

  const demoResult: AuditResult = {
    score,
    grade,
    summary:
      "This showcase PR adds checkout, webhooks, exports, and auth touchpoints. The scan surfaced a CRITICAL injection issue, a HIGH-severity credential-in-source finding, additional HIGH/MEDIUM items (XSS surface, brute-force risk, CSRF, path traversal, SSRF), plus quality, architecture, testing, and documentation gaps on the payment path.",
    metadata: {
      timestamp: new Date().toISOString(),
      filesChanged: 14,
      linesChanged: 892,
      modelUsed: "anthropic/claude-sonnet-4 (demo fixture)",
      pipelineDurationMs: 168_000,
      configFingerprint: "demo-showcase-v2",
      pipelineEtaMsEstimate: 175_000,
    },
    recon: {
      changedFiles: [
        { path: "app/api/checkout/route.ts" },
        { path: "app/api/auth/login/route.ts" },
        { path: "app/api/exports/[id]/route.ts" },
        { path: "app/api/webhooks/dispatch/route.ts" },
        { path: "app/api/admin/exports/route.ts" },
        { path: "lib/db/orders.ts" },
        { path: "lib/env.ts" },
        { path: "lib/auth/session.ts" },
        { path: "lib/email/receipt.tsx" },
        { path: "middleware.ts" },
      ],
      languages: ["TypeScript"],
      packageManager: "pnpm",
      frameworkHints: ["Next.js App Router", "React 19"],
      diff: `diff --git a/lib/db/orders.ts b/lib/db/orders.ts
--- a/lib/db/orders.ts
+++ b/lib/db/orders.ts
@@ -1,5 +1,7 @@
 export async function getOrder(id: string) {
-  return db.query(\`SELECT * FROM orders WHERE id = '\${id}'\`);
+  return db.query("SELECT * FROM orders WHERE id = $1", [id]);
 }
+
+// ...`,
      linesChanged: 892,
      secretPatternHints: ["sk_live_", "PAYMENTS_API_KEY"],
      dependencyGraph: {
        changedModules: [
          {
            file: "app/api/checkout/route.ts",
            imports: ["@/lib/db/orders", "@/lib/auth/session", "@/lib/env"],
            importedBy: ["app/checkout/page.tsx"],
            exportsUsedElsewhere: ["POST"],
          },
          {
            file: "lib/email/receipt.tsx",
            imports: ["react"],
            importedBy: ["app/api/checkout/route.ts"],
            exportsUsedElsewhere: ["ReceiptEmail"],
          },
        ],
        securitySensitiveAPIs: [
          "db.query",
          "cookies()",
          "dangerouslySetInnerHTML",
          "fetch",
          "fs.readFile",
        ],
        envVarsTouched: ["DATABASE_URL", "PAYMENTS_API_KEY", "SESSION_SECRET"],
      },
    },
    phases: [
      {
        phase: "code-quality",
        summary:
          "Readable but dense handlers; duplicate validation and missing docs. One performance nit on sequential queries.",
        findings: codeQualityFindings,
      },
      {
        phase: "vulnerability-scan",
        summary:
          "CRITICAL SQL injection requires immediate fix. Additional findings span credential handling, XSS, authentication hardening, CSRF, path traversal, SSRF, headers, and logging hygiene.",
        findings: vulnFindings,
      },
      {
        phase: "threat-model",
        summary:
          "Residual access-control gap on admin exports and missing negative tests on the payment path amplify merge risk.",
        findings: threatPhaseFindings,
      },
    ],
    findings: allFindings,
    threatModel: {
      attackSurfaces: [
        {
          name: "POST /api/checkout",
          type: "HTTP API",
          exposure: "Public",
          riskLevel: "CRITICAL",
          description:
            "Mutates orders and triggers payment capture; high value and high abuse potential.",
        },
        {
          name: "POST /api/auth/login",
          type: "HTTP API",
          exposure: "Public",
          riskLevel: "HIGH",
          description: "Credential verification without rate limiting enables automated guessing.",
        },
        {
          name: "POST /api/webhooks/dispatch",
          type: "HTTP API",
          exposure: "Internal",
          riskLevel: "MEDIUM",
          description: "Server-side fetch to URLs from job payloads — SSRF if abused.",
        },
        {
          name: "GET /api/exports/:id",
          type: "HTTP API",
          exposure: "Authenticated",
          riskLevel: "MEDIUM",
          description: "File read path must stay confined to an export sandbox.",
        },
        {
          name: "PostgreSQL (orders & payments)",
          type: "Datastore",
          exposure: "Internal",
          riskLevel: "HIGH",
          description:
            "Stores PII and payment references; integrity depends on query safety and keys.",
        },
      ],
      attackPaths: [
        {
          name: "SQL injection → bulk data theft",
          mermaidDiagram: `graph TD
  U[Attacker] -->|malicious orderId| API[checkout API]
  API --> Q[Interpolated SQL]
  Q --> DB[(PostgreSQL)]
  DB --> X[Exfiltrated rows]`,
          riskAssessment:
            "Critical impact: unparameterized query allows reading or modifying arbitrary rows.",
        },
        {
          name: "SSRF → cloud metadata",
          mermaidDiagram: `graph LR
  J[Webhook job] -->|targetUrl| W[fetch]
  W --> M[Metadata service]
  M --> K[Instance credentials]`,
          riskAssessment:
            "High in cloud deployments: internal URLs must be blocklisted and allowlisted.",
        },
        {
          name: "Stored XSS → receipt HTML",
          mermaidDiagram: `graph TD
  N[Display name] --> DB[(Users)]
  DB --> E[Receipt HTML]
  E --> Mail[Email client]`,
          riskAssessment:
            "Medium–high: depends on mail client scripting; sanitize all HTML composition.",
        },
      ],
      overallRisk:
        "Elevated: CRITICAL injection and secret exposure must be fixed before any production merge. HIGH items should follow in the same release train.",
      mergeRecommendation:
        "Request changes: remediate CRITICAL findings, rotate exposed credentials, then re-audit.",
      compoundRiskSummary:
        "Payment + auth + webhooks in one PR compounds blast radius — treat as a release blocker until keys and SQL are fixed.",
      strideCategorization: [
        {
          label: "SQLi / query tampering",
          stride: "T",
          description: "Untrusted input alters query structure.",
        },
        {
          label: "Credential theft via logs",
          stride: "I",
          description: "Sensitive material in stdout feeds centralized logging.",
        },
        {
          label: "SSRF to metadata",
          stride: "I",
          description: "Server fetches attacker-controlled URLs.",
        },
        {
          label: "CSRF on checkout",
          stride: "S",
          description: "Browser cannot prove intent without a second factor or token.",
        },
      ],
      trustBoundaries: [
        {
          name: "Browser ↔ Next.js",
          description:
            "Cookies, CSRF tokens, and SameSite policy should bind mutations to first-party origin.",
        },
        {
          name: "App ↔ payment provider",
          description:
            "Secrets only via env; outbound calls allowlisted; idempotency keys on retries.",
        },
      ],
      riskMatrix: [
        {
          likelihood: "high",
          impact: "high",
          topic: "SQL injection on orders",
          notes: "Direct string concat in repository layer.",
        },
        {
          likelihood: "high",
          impact: "high",
          topic: "Committed live API key",
          notes: "Assume compromise; rotate and purge history policy-side.",
        },
        {
          likelihood: "medium",
          impact: "high",
          topic: "SSRF via webhook worker",
          notes: "Network egress policy + URL allowlist.",
        },
        {
          likelihood: "medium",
          impact: "medium",
          topic: "CSRF on checkout POST",
          notes: "Double-submit cookie or CSRF token.",
        },
        {
          likelihood: "low",
          impact: "medium",
          topic: "HTML injection in receipts",
          notes: "Sanitize or use React text nodes only.",
        },
      ],
    },
    prSummary: {
      narrative:
        "The PR expands commerce flows: checkout, PSP integration, webhook retries, CSV export, and admin listing. Touches auth session helpers, middleware, and transactional email. Risk is front-loaded on payment and data access layers.",
      sequenceDiagrams: [
        {
          title: "Checkout (simplified)",
          mermaidDiagram: `sequenceDiagram
  participant B as Browser
  participant R as Route
  participant P as PSP
  participant D as DB
  B->>R: POST /api/checkout
  R->>P: charge
  P-->>R: 200 / 402
  R->>D: insert order
  D-->>R: ok
  R-->>B: 200 JSON`,
          description:
            "Happy path and PSP failure should both leave the DB consistent — add tests.",
        },
        {
          title: "Webhook retry",
          mermaidDiagram: `sequenceDiagram
  participant Q as Queue
  participant W as Worker
  participant U as URL
  Q->>W: job
  W->>U: GET
  U-->>W: response
  W->>Q: ack / retry`,
          description: "URL must be validated before fetch.",
        },
      ],
      dependencyImpact: [
        {
          file: "app/api/checkout/route.ts",
          impactedBy: [
            "lib/db/orders.ts",
            "lib/auth/session.ts",
            "lib/env.ts",
            "lib/email/receipt.tsx",
          ],
          impactType: "direct",
        },
        {
          file: "app/api/webhooks/dispatch/route.ts",
          impactedBy: ["lib/env.ts"],
          impactType: "direct",
        },
      ],
      breakingChanges: [],
      complexity: "large",
    },
    verdict: {
      verdict: "request-changes",
      reasoning:
        "CRITICAL findings (SQL injection, committed API key) block approval. Address HIGH items (XSS surface, login rate limit) before merge; follow with MEDIUM CSRF, SSRF, and path traversal fixes. Re-run the audit after rotation and remediation.",
    },
    teamPatterns: [
      {
        pattern: "String-built SQL in data layer",
        evidence: "Third hit this quarter in `lib/db/*` — add a lint or enforced query helper.",
        elevated: true,
      },
      {
        pattern: "Secrets in `lib/env` fallbacks",
        evidence:
          "Matches prior incident in PR #88 — forbid non-empty defaults for credential envs.",
        elevated: true,
      },
      {
        pattern: "API routes without CSRF on mutating POST",
        evidence: "Same gap as `app/api/cart/route.ts` (#412); standardize middleware.",
        elevated: false,
      },
    ],
  };

  return parseAuditResult(demoResult);
}

let cachedResult: AuditResult | null = null;

function getCachedDemoResult(): AuditResult {
  cachedResult ??= buildDemoAuditResult();
  return cachedResult;
}

/** Full `AuditData` for the showcase report (same shape as Redis). */
export function getDemoAuditData(): AuditData {
  return {
    status: "complete",
    timestamp: new Date().toISOString(),
    pr: {
      owner: "demo",
      repo: "clawguard-showcase",
      number: 1,
      title: "[Demo] Checkout, webhooks, exports — full ClawGuard showcase",
    },
    result: getCachedDemoResult(),
  };
}
