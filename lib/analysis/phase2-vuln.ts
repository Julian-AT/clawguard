import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { PhaseResultSchema, type PhaseResult } from "./types";

/**
 * Phase 2: Vulnerability Scan (SCAN-03)
 *
 * Scans the PR diff for security vulnerabilities. Receives Phase 1 (code quality)
 * summary as context to avoid duplicate findings and focus on uncovered areas.
 */
export async function runVulnerabilityScan(
  tools: Record<string, any>,
  diff: string,
  phase1Summary: string
): Promise<PhaseResult> {
  const agent = new ToolLoopAgent({
    model: gateway("anthropic/claude-sonnet-4.6"),
    tools,
    output: Output.object({ schema: PhaseResultSchema }),
    stopWhen: stepCountIs(30),
    instructions: [
      "You are an application security engineer performing a vulnerability assessment.",
      "",
      "Scan the PR diff for security vulnerabilities.",
      "Phase 1 (code quality review) has already been completed. Focus on vulnerabilities not yet covered.",
      "",
      "Explicitly check for the following vulnerability categories:",
      "- SQL injection, NoSQL injection, command injection, LDAP injection",
      "- Hardcoded secrets, API keys, tokens, passwords in code",
      "- Authentication bypass (missing auth checks, weak auth logic)",
      "- Authorization gaps (missing RBAC checks, privilege escalation)",
      "- CSRF (missing tokens, improper validation)",
      "- IDOR (insecure direct object references, missing ownership checks)",
      "- Path traversal (directory traversal, file inclusion)",
      "- Unsafe eval/deserialization (eval(), Function(), JSON.parse of untrusted input, pickle)",
      "- Data exposure and PII logging (sensitive data in logs, responses, errors)",
      "- Insecure cryptography (weak algorithms, hardcoded keys, missing salt)",
      "- Race conditions (TOCTOU, concurrent access without locks)",
      "- Open redirects (unvalidated redirect URLs)",
      "- Missing input validation (unvalidated user input reaching sensitive operations)",
      "- XSS: reflected, stored, and DOM-based cross-site scripting",
      "",
      "For each finding:",
      "- Assign severity: CRITICAL, HIGH, MEDIUM, LOW, or INFO",
      "- Identify the CWE ID (e.g., CWE-89 for SQL injection)",
      "- Map to OWASP Top 10 2021 category (e.g., A03:2021-Injection)",
      "- Describe the vulnerability with a realistic attack scenario",
      "- Trace data flow: source (where tainted input enters) -> transform (how it is processed) -> sink (where it reaches a dangerous operation)",
      "- Provide before/after fix code snippets",
      "- Map to compliance frameworks where applicable (PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS)",
      "",
      "Set confidence based on certainty of the vulnerability:",
      "- 'HIGH': definite vulnerability with clear exploit path",
      "- 'MEDIUM': likely vulnerability, needs confirmation",
      "- 'LOW': possible vulnerability, requires manual review",
      "",
      "Use bash tools to explore the full file context and trace data flows through the codebase.",
      "Output format: Provide a brief summary and detailed findings array using the structured output schema.",
    ].join("\n"),
  });

  try {
    const result = await agent.generate({
      prompt: [
        "Scan this pull request diff for security vulnerabilities.",
        "Use bash tools to explore the repository and trace data flows through the codebase.",
        "",
        "<phase1_context>",
        phase1Summary,
        "</phase1_context>",
        "",
        "<diff>",
        diff,
        "</diff>",
      ].join("\n"),
    });
    return result.output;
  } catch (error) {
    console.error("[phase-2] Agent error:", error);
    return {
      summary: "Phase 2 analysis could not produce structured output",
      findings: [],
    };
  }
}
