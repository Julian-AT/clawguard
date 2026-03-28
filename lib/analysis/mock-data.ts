import type { AuditResult, Finding } from "./types";
import { calculateScore, getGrade } from "./scoring";

const mockFindings: Finding[] = [
  {
    id: "VULN-001",
    severity: "CRITICAL",
    type: "SQL Injection",
    title: "Unsanitized user input in database query",
    file: "src/routes/users.ts",
    line: 42,
    cweId: "CWE-89",
    owaspCategory: "A03:2021-Injection",
    description: "User-supplied input is concatenated directly into a SQL query string without parameterization, allowing attackers to inject arbitrary SQL commands.",
    attackScenario: "An attacker sends a crafted username parameter like `admin' OR '1'='1' --` to bypass authentication and extract all user records from the database.",
    confidence: "HIGH",
    dataFlow: {
      nodes: [
        { label: "req.params.username", type: "source" },
        { label: "String concatenation", type: "transform" },
        { label: "db.query()", type: "sink" },
      ],
      description: "User input flows from request parameter through string concatenation directly into database query execution",
    },
    fix: {
      before: "const result = await db.query(`SELECT * FROM users WHERE username = '${req.params.username}'`);",
      after: "const result = await db.query('SELECT * FROM users WHERE username = $1', [req.params.username]);",
      file: "src/routes/users.ts",
      startLine: 42,
      endLine: 42,
    },
    complianceMapping: {
      pciDss: ["6.5.1"],
      soc2: ["CC6.1"],
      hipaa: ["164.312(a)(1)"],
      nist: ["SI-10"],
      owaspAsvs: ["5.3.4"],
    },
  },
  {
    id: "VULN-002",
    severity: "CRITICAL",
    type: "Hardcoded Secret",
    title: "JWT secret hardcoded in source code",
    file: "src/auth/jwt.ts",
    line: 8,
    cweId: "CWE-798",
    owaspCategory: "A02:2021-Cryptographic Failures",
    description: "The JWT signing secret is hardcoded as a string literal in the source code. Anyone with repository access can forge valid tokens.",
    attackScenario: "An attacker with read access to the repository extracts the JWT secret and forges authentication tokens to impersonate any user.",
    confidence: "HIGH",
    dataFlow: {
      nodes: [
        { label: "Hardcoded string 'super-secret-key'", type: "source" },
        { label: "jwt.sign()", type: "transform" },
        { label: "Authorization header", type: "sink" },
      ],
    },
    fix: {
      before: "const JWT_SECRET = 'super-secret-key-123';",
      after: "const JWT_SECRET = process.env.JWT_SECRET!;",
      file: "src/auth/jwt.ts",
      startLine: 8,
      endLine: 8,
    },
    complianceMapping: {
      pciDss: ["6.5.3"],
      soc2: ["CC6.1"],
      hipaa: ["164.312(a)(2)(iv)"],
      nist: ["SC-12"],
      owaspAsvs: ["2.10.4"],
    },
  },
  {
    id: "VULN-003",
    severity: "HIGH",
    type: "Missing Rate Limiting",
    title: "Authentication endpoint has no rate limiting",
    file: "src/routes/auth.ts",
    line: 15,
    cweId: "CWE-307",
    owaspCategory: "A07:2021-Identification and Authentication Failures",
    description: "The login endpoint accepts unlimited authentication attempts with no rate limiting, delay, or account lockout mechanism.",
    attackScenario: "An attacker performs a brute-force attack against the login endpoint, trying thousands of password combinations per minute until finding valid credentials.",
    confidence: "HIGH",
    fix: {
      before: "app.post('/login', async (req, res) => {",
      after: "app.post('/login', rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }), async (req, res) => {",
      file: "src/routes/auth.ts",
      startLine: 15,
      endLine: 15,
    },
    complianceMapping: {
      pciDss: ["6.5.10"],
      soc2: ["CC6.1"],
      hipaa: [],
      nist: ["AC-7"],
      owaspAsvs: ["2.2.1"],
    },
  },
  {
    id: "VULN-004",
    severity: "MEDIUM",
    type: "Path Traversal",
    title: "File path constructed from user input without sanitization",
    file: "src/routes/files.ts",
    line: 28,
    cweId: "CWE-22",
    owaspCategory: "A01:2021-Broken Access Control",
    description: "User-supplied filename is used directly in a file path without sanitization, allowing directory traversal attacks.",
    attackScenario: "An attacker requests filename `../../etc/passwd` to read sensitive system files outside the intended directory.",
    confidence: "MEDIUM",
    dataFlow: {
      nodes: [
        { label: "req.query.filename", type: "source" },
        { label: "path.join(uploadDir, filename)", type: "transform" },
        { label: "fs.readFile()", type: "sink" },
      ],
    },
    fix: {
      before: "const filePath = path.join(uploadDir, req.query.filename);",
      after: "const safeName = path.basename(req.query.filename);\nconst filePath = path.join(uploadDir, safeName);",
      file: "src/routes/files.ts",
      startLine: 28,
      endLine: 28,
    },
    complianceMapping: {
      pciDss: ["6.5.8"],
      soc2: ["CC6.1"],
      hipaa: [],
      nist: ["SI-10"],
      owaspAsvs: ["12.3.1"],
    },
  },
  {
    id: "VULN-005",
    severity: "LOW",
    type: "Missing Security Headers",
    title: "Response missing X-Content-Type-Options header",
    file: "src/middleware/headers.ts",
    line: 5,
    cweId: "CWE-693",
    owaspCategory: "A05:2021-Security Misconfiguration",
    description: "The application does not set X-Content-Type-Options header, which could allow MIME type sniffing attacks.",
    attackScenario: "A browser interprets an uploaded file as a different MIME type, potentially executing malicious content.",
    confidence: "HIGH",
    fix: {
      before: "res.setHeader('X-Frame-Options', 'DENY');",
      after: "res.setHeader('X-Frame-Options', 'DENY');\nres.setHeader('X-Content-Type-Options', 'nosniff');",
      file: "src/middleware/headers.ts",
      startLine: 5,
      endLine: 5,
    },
    complianceMapping: {
      pciDss: [],
      soc2: ["CC6.1"],
      hipaa: [],
      nist: ["SC-8"],
      owaspAsvs: ["14.4.3"],
    },
  },
  {
    id: "VULN-006",
    severity: "INFO",
    type: "Console Logging",
    title: "Sensitive data logged to console",
    file: "src/routes/auth.ts",
    line: 32,
    cweId: "CWE-532",
    owaspCategory: "A09:2021-Security Logging and Monitoring Failures",
    description: "User credentials are logged to console.log which may appear in application logs accessible to operations staff.",
    attackScenario: "An attacker with access to application logs can read plaintext passwords from log entries.",
    confidence: "MEDIUM",
    fix: {
      before: "console.log('Login attempt:', { username, password });",
      after: "console.log('Login attempt:', { username, password: '[REDACTED]' });",
      file: "src/routes/auth.ts",
      startLine: 32,
      endLine: 32,
    },
    complianceMapping: {
      pciDss: ["3.4"],
      soc2: ["CC6.1"],
      hipaa: ["164.312(a)(1)"],
      nist: ["AU-3"],
      owaspAsvs: ["7.1.1"],
    },
  },
];

const score = calculateScore(mockFindings);
const grade = getGrade(score);

export const mockAuditResult: AuditResult = {
  score,
  grade,
  phases: [
    {
      phase: "code-quality",
      findings: [],
      summary: "Code structure follows reasonable patterns but lacks input validation throughout.",
    },
    {
      phase: "vulnerability-scan",
      findings: mockFindings.filter((f) =>
        ["SQL Injection", "Hardcoded Secret", "Path Traversal", "Missing Security Headers", "Console Logging"].includes(f.type)
      ),
      summary: "Found 5 vulnerabilities including 2 critical issues requiring immediate attention.",
    },
    {
      phase: "threat-model",
      findings: mockFindings.filter((f) => f.type === "Missing Rate Limiting"),
      summary: "Authentication system lacks rate limiting, creating brute-force attack surface.",
    },
  ],
  findings: mockFindings,
  threatModel: {
    attackSurfaces: [
      {
        name: "Authentication Endpoint",
        type: "API",
        exposure: "Public Internet",
        riskLevel: "HIGH",
        description: "Login endpoint accepts credentials over HTTPS but lacks rate limiting and account lockout.",
      },
      {
        name: "File Upload Service",
        type: "API",
        exposure: "Authenticated Users",
        riskLevel: "MEDIUM",
        description: "File upload endpoint with path traversal vulnerability in filename handling.",
      },
      {
        name: "Database Query Interface",
        type: "Internal",
        exposure: "Internal Network",
        riskLevel: "CRITICAL",
        description: "SQL queries constructed from unsanitized user input via string concatenation.",
      },
    ],
    attackPaths: [
      {
        name: "Authentication Bypass via SQL Injection",
        mermaidDiagram: "graph LR\n  A[Attacker] -->|Crafted username| B[Login Form]\n  B -->|Unsanitized input| C[SQL Query]\n  C -->|Injected SQL| D[Database]\n  D -->|All records| E[Data Exfiltration]",
        riskAssessment: "CRITICAL: Direct path from public endpoint to database compromise. No input validation at any stage.",
      },
      {
        name: "Credential Theft via Log Access",
        mermaidDiagram: "graph LR\n  A[User] -->|Login| B[Auth Endpoint]\n  B -->|console.log| C[Application Logs]\n  C -->|Log access| D[Insider/Attacker]\n  D -->|Plaintext creds| E[Account Takeover]",
        riskAssessment: "MEDIUM: Requires access to application logs, but plaintext credentials enable full account compromise.",
      },
    ],
    strideCategorization: [
      {
        label: "SQL injection on auth",
        stride: "I",
        description: "Information disclosure via database query manipulation",
      },
    ],
    trustBoundaries: [],
    riskMatrix: [
      {
        likelihood: "high",
        impact: "high",
        topic: "SQLi on login",
        notes: "Direct DB access from public input",
      },
    ],
  },
  prSummary: {
    narrative:
      "This PR introduces user authentication routes and password handling. It adds new API endpoints and database access patterns that should be reviewed for injection and secret handling.",
    sequenceDiagrams: [
      {
        title: "Login request",
        mermaidDiagram:
          "sequenceDiagram\n  participant U as User\n  participant API as API\n  participant DB as DB\n  U->>API: POST /login\n  API->>DB: query(user input)\n  DB-->>API: rows\n  API-->>U: JWT",
        description: "Simplified login flow for the changed code.",
      },
    ],
    dependencyImpact: [
      {
        file: "src/routes/auth.ts",
        impactedBy: ["src/middleware.ts"],
        impactType: "direct",
      },
    ],
    breakingChanges: [],
    complexity: "medium",
  },
  summary: "Security audit found 6 issues across 4 severity levels. 2 CRITICAL findings require immediate remediation: SQL injection in user queries and hardcoded JWT secret. The authentication system also lacks rate limiting (HIGH) and file handling has a path traversal vulnerability (MEDIUM).",
};

export const mockAuditData = {
  result: mockAuditResult,
  timestamp: new Date().toISOString(),
  pr: {
    owner: "techcorp",
    repo: "api",
    number: 1,
    title: "Add user authentication",
  },
  status: "complete" as const,
};
