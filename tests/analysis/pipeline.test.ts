import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted for mock variables used in vi.mock factories
const {
  mockRunCommand,
  mockStop,
  mockSandboxCreate,
  mockCreateBashTool,
  mockRunQualityReview,
  mockRunVulnerabilityScan,
  mockRunThreatModel,
  defaultPhase1Result,
  defaultPhase2Result,
  defaultPhase3Result,
} = vi.hoisted(() => {
  const mockRunCommand = vi.fn().mockResolvedValue({
    stdout: vi.fn().mockResolvedValue("mock diff output"),
  });
  const mockStop = vi.fn().mockResolvedValue(undefined);
  const mockSandboxCreate = vi.fn().mockResolvedValue({
    runCommand: mockRunCommand,
    stop: mockStop,
  });
  const mockCreateBashTool = vi
    .fn()
    .mockResolvedValue({ tools: { bash: {} } });

  const defaultPhase1Result = {
    summary: "Phase 1: No major quality issues found",
    findings: [
      {
        severity: "MEDIUM",
        type: "error-handling-gap",
        location: { file: "src/api.ts", line: 42 },
        cweId: "CWE-209",
        owaspCategory: "A04:2021-Insecure Design",
        description: "Generic error message leaks stack trace",
        attackScenario:
          "Attacker triggers error to obtain internal stack trace",
        confidence: "high",
        dataFlow: {
          source: "Error object",
          transform: "toString()",
          sink: "res.json()",
        },
        fix: {
          before: "res.json({ error: err.toString() })",
          after: 'res.json({ error: "Internal server error" })',
        },
        complianceMapping: { nist: "SI-11" },
      },
    ],
  };

  const defaultPhase2Result = {
    summary: "Phase 2: Found SQL injection and hardcoded secret",
    findings: [
      {
        severity: "CRITICAL",
        type: "sql-injection",
        location: { file: "src/db.ts", line: 15 },
        cweId: "CWE-89",
        owaspCategory: "A03:2021-Injection",
        description: "Unparameterized SQL query with user input",
        attackScenario: "Attacker injects SQL via username field",
        confidence: "high",
        dataFlow: {
          source: "req.body.username",
          transform: "string concatenation",
          sink: "db.query()",
        },
        fix: {
          before: '`SELECT * FROM users WHERE name = \'${name}\'`',
          after: "db.query('SELECT * FROM users WHERE name = $1', [name])",
        },
        complianceMapping: { pciDss: "6.5.1", owaspAsvs: "5.3.4" },
      },
      {
        severity: "HIGH",
        type: "hardcoded-secret",
        location: { file: "src/config.ts", line: 3 },
        cweId: "CWE-798",
        owaspCategory: "A07:2021-Identification and Authentication Failures",
        description: "API key hardcoded in source code",
        attackScenario:
          "Attacker finds API key in public repo and accesses service",
        confidence: "high",
        dataFlow: {
          source: "hardcoded string",
          transform: "none",
          sink: "API client constructor",
        },
        fix: {
          before: 'const API_KEY = "sk-1234567890"',
          after: "const API_KEY = process.env.API_KEY!",
        },
        complianceMapping: { soc2: "CC6.1" },
      },
    ],
  };

  const defaultPhase3Result = {
    summary: "Phase 3: SQL injection + error leak enables data exfiltration",
    findings: [
      {
        severity: "CRITICAL",
        type: "compound-attack-path",
        location: { file: "src/api.ts", line: 42 },
        cweId: "CWE-200",
        owaspCategory: "A01:2021-Broken Access Control",
        description:
          "SQL injection combined with verbose error messages enables blind data exfiltration",
        attackScenario:
          "Attacker uses SQL injection to trigger errors, verbose error messages reveal database schema",
        confidence: "high",
        dataFlow: {
          source: "req.body.username",
          transform: "SQL injection -> error -> toString()",
          sink: "res.json()",
        },
        fix: {
          before: "Unparameterized query + verbose errors",
          after: "Parameterized query + generic error messages",
        },
        complianceMapping: { nist: "SI-11", pciDss: "6.5.1" },
      },
    ],
  };

  const mockRunQualityReview = vi.fn().mockResolvedValue(defaultPhase1Result);
  const mockRunVulnerabilityScan = vi.fn().mockResolvedValue(defaultPhase2Result);
  const mockRunThreatModel = vi.fn().mockResolvedValue(defaultPhase3Result);

  return {
    mockRunCommand,
    mockStop,
    mockSandboxCreate,
    mockCreateBashTool,
    mockRunQualityReview,
    mockRunVulnerabilityScan,
    mockRunThreatModel,
    defaultPhase1Result,
    defaultPhase2Result,
    defaultPhase3Result,
  };
});

vi.mock("@vercel/sandbox", () => ({
  Sandbox: { create: mockSandboxCreate },
}));

vi.mock("bash-tool", () => ({
  createBashTool: mockCreateBashTool,
}));

vi.mock("../../lib/analysis/phase1-quality", () => ({
  runQualityReview: mockRunQualityReview,
}));

vi.mock("../../lib/analysis/phase2-vuln", () => ({
  runVulnerabilityScan: mockRunVulnerabilityScan,
}));

vi.mock("../../lib/analysis/phase3-threat", () => ({
  runThreatModel: mockRunThreatModel,
}));

import { runSecurityPipeline } from "../../lib/analysis/pipeline";

describe("Security Pipeline", () => {
  const defaultInput = {
    owner: "test-owner",
    repo: "test-repo",
    prBranch: "feature/test",
    baseBranch: "main",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default implementations after clearAllMocks
    mockRunCommand.mockResolvedValue({
      stdout: vi.fn().mockResolvedValue("mock diff output"),
    });
    mockStop.mockResolvedValue(undefined);
    mockSandboxCreate.mockResolvedValue({
      runCommand: mockRunCommand,
      stop: mockStop,
    });
    mockRunQualityReview.mockResolvedValue(defaultPhase1Result);
    mockRunVulnerabilityScan.mockResolvedValue(defaultPhase2Result);
    mockRunThreatModel.mockResolvedValue(defaultPhase3Result);
  });

  it("calls phases in correct order: quality -> vulnerability -> threat", async () => {
    const callOrder: string[] = [];
    mockRunQualityReview.mockImplementation(async () => {
      callOrder.push("quality");
      return {
        summary: "Phase 1 summary",
        findings: [],
      };
    });
    mockRunVulnerabilityScan.mockImplementation(async () => {
      callOrder.push("vulnerability");
      return {
        summary: "Phase 2 summary",
        findings: [],
      };
    });
    mockRunThreatModel.mockImplementation(async () => {
      callOrder.push("threatModel");
      return {
        summary: "Phase 3 summary",
        findings: [],
      };
    });

    await runSecurityPipeline(defaultInput);

    expect(callOrder).toEqual(["quality", "vulnerability", "threatModel"]);
  });

  it("passes phase1 summary to phase2, and phase1+2 summaries to phase3", async () => {
    await runSecurityPipeline(defaultInput);

    // Phase 2 receives phase1 summary as 3rd arg
    expect(mockRunVulnerabilityScan).toHaveBeenCalledWith(
      expect.any(Object), // tools
      "mock diff output", // diff
      "Phase 1: No major quality issues found" // phase1Summary
    );

    // Phase 3 receives both summaries as 3rd and 4th args
    expect(mockRunThreatModel).toHaveBeenCalledWith(
      expect.any(Object), // tools
      "mock diff output", // diff
      "Phase 1: No major quality issues found", // phase1Summary
      "Phase 2: Found SQL injection and hardcoded secret" // phase2Summary
    );
  });

  it("aggregates findings from all three phases", async () => {
    const result = await runSecurityPipeline(defaultInput);

    // phase1: 1 finding, phase2: 2 findings, phase3: 1 finding
    expect(result.allFindings).toHaveLength(4);
    expect(result.allFindings.map((f) => f.type)).toEqual([
      "error-handling-gap",
      "sql-injection",
      "hardcoded-secret",
      "compound-attack-path",
    ]);
  });

  it("calculates correct score and grade", async () => {
    const result = await runSecurityPipeline(defaultInput);

    // Deductions: CRITICAL(25) + CRITICAL(25) + HIGH(15) + MEDIUM(8) = 73
    // Score: 100 - 73 = 27 -> Grade: F
    expect(result.score).toBe(27);
    expect(result.grade).toBe("F");
  });

  it("calls onProgress callback for each phase", async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);

    await runSecurityPipeline(defaultInput, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(6);
    expect(onProgress).toHaveBeenNthCalledWith(1, "quality", "running");
    expect(onProgress).toHaveBeenNthCalledWith(2, "quality", "complete");
    expect(onProgress).toHaveBeenNthCalledWith(3, "vulnerability", "running");
    expect(onProgress).toHaveBeenNthCalledWith(4, "vulnerability", "complete");
    expect(onProgress).toHaveBeenNthCalledWith(5, "threatModel", "running");
    expect(onProgress).toHaveBeenNthCalledWith(6, "threatModel", "complete");
  });

  it("stops sandbox in finally block", async () => {
    await runSecurityPipeline(defaultInput);

    expect(mockStop).toHaveBeenCalled();
  });

  it("stops sandbox even when an agent throws", async () => {
    mockRunQualityReview.mockRejectedValueOnce(new Error("Agent failed"));

    await expect(runSecurityPipeline(defaultInput)).rejects.toThrow(
      "Agent failed"
    );
    expect(mockStop).toHaveBeenCalled();
  });

  it("creates sandbox with 10 minute timeout", async () => {
    await runSecurityPipeline(defaultInput);

    expect(mockSandboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 10 * 60 * 1000,
      })
    );
  });

  it("returns correct severity counts", async () => {
    const result = await runSecurityPipeline(defaultInput);

    expect(result.severityCounts).toEqual({
      CRITICAL: 2,
      HIGH: 1,
      MEDIUM: 1,
      LOW: 0,
      INFO: 0,
    });
  });

  it("returns all phase results in phases object", async () => {
    const result = await runSecurityPipeline(defaultInput);

    expect(result.phases.quality.summary).toBe(
      "Phase 1: No major quality issues found"
    );
    expect(result.phases.vulnerability.summary).toBe(
      "Phase 2: Found SQL injection and hardcoded secret"
    );
    expect(result.phases.threatModel.summary).toBe(
      "Phase 3: SQL injection + error leak enables data exfiltration"
    );
  });
});
