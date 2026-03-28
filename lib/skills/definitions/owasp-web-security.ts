import type { SkillDefinition } from "@/lib/skills/types";

export const owaspWebSecurity: SkillDefinition = {
  id: "owasp-web-security",
  name: "OWASP Web Security (Top 10 2021)",
  domain: "security",
  applicableTo: ["security-scan", "api-security", "*"],
  priority: 1,
  content: `Use OWASP Top 10 2021 as the primary taxonomy when classifying web findings.

A01 Broken Access Control: Look for missing authorization on routes, IDOR (predictable IDs), forced browsing, CORS misconfig that bypasses auth, JWT claims trusted without server checks. CWE-284, CWE-285, CWE-639. Severity: HIGH when users can access others' data or admin functions.

A02 Cryptographic Failures: Hardcoded keys, weak algorithms (MD5/SHA1 for passwords), missing TLS, sensitive data in logs or URLs. CWE-327, CWE-916. Severity: HIGH for credential or PII exposure.

A03 Injection: SQL (string concat, raw queries), NoSQL, OS command, LDAP, XPath. CWE-89, CWE-78. Severity: CRITICAL when user input reaches execution.

A04 Insecure Design: Trust boundaries ignored, risky convenience features without analysis. Map to design CWEs; MEDIUM–HIGH by impact.

A05 Misconfiguration: Default creds, debug in prod, verbose errors, open dirs. CWE-16, CWE-611. MEDIUM unless takeover.

A06 Vulnerable Components: Outdated libs with CVEs. CWE-1104. Severity by CVE.

A07 Auth Failures: Weak sessions, credential stuffing enablers, missing MFA, fixation. CWE-287, CWE-384. CRITICAL for hijack/takeover.

A08 Integrity: Unsigned updates, unsafe deserialization, supply-chain gaps. CWE-502, CWE-494. HIGH–CRITICAL.

A09 Logging Gaps: Missing audit on sensitive actions. CWE-778. LOW–MEDIUM unless compliance requires.

A10 SSRF: User URLs to internal/metadata endpoints. CWE-918. HIGH–CRITICAL.

Patterns: SQLi CWE-89; XSS CWE-79; CSRF CWE-352; SSRF CWE-918; cmd inj CWE-78; path trav CWE-22; deser CWE-502. CRITICAL: injection, broken auth/session. HIGH: crypto, access bypass. MEDIUM: misconfig, limited XSS. LOW: logging only.`,
};
