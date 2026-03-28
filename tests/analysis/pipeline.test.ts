import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRunCommand,
  mockStop,
  mockSandboxCreate,
  mockCreateBashTool,
  mockRunReconnaissance,
  mockRunSecurityScan,
  mockRunThreatSynthesis,
  defaultRecon,
  defaultScan,
  defaultThreat,
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

  const defaultRecon = {
    changedFiles: [{ path: "src/api.ts" }],
    languages: ["TypeScript"],
    frameworkHints: ["Next.js"],
    diff: "mock diff output",
    linesChanged: 12,
  };

  const defaultScan = {
    summary: "Scan complete",
    findings: [
      {
        severity: "HIGH" as const,
        type: "xss",
        file: "src/api.ts",
        line: 1,
        cweId: "CWE-79",
        owaspCategory: "A03:2021-Injection",
        description: "Reflected XSS",
        attackScenario: "Inject script",
        confidence: "HIGH" as const,
      },
    ],
    partialFailure: false,
  };

  const defaultThreat = {
    summary: "Threat model complete",
    findings: defaultScan.findings,
    threatModel: {
      attackSurfaces: [
        {
          name: "Web",
          type: "HTTP",
          exposure: "Public",
          riskLevel: "HIGH" as const,
          description: "User input",
        },
      ],
      attackPaths: [
        {
          name: "XSS",
          mermaidDiagram: "graph LR\n  A-->B",
          riskAssessment: "High",
        },
      ],
      overallRisk: "HIGH",
      mergeRecommendation: "Request changes",
    },
  };

  const mockRunReconnaissance = vi.fn().mockResolvedValue(defaultRecon);
  const mockRunSecurityScan = vi.fn().mockResolvedValue(defaultScan);
  const mockRunThreatSynthesis = vi.fn().mockResolvedValue(defaultThreat);

  return {
    mockRunCommand,
    mockStop,
    mockSandboxCreate,
    mockCreateBashTool,
    mockRunReconnaissance,
    mockRunSecurityScan,
    mockRunThreatSynthesis,
    defaultRecon,
    defaultScan,
    defaultThreat,
  };
});

vi.mock("@vercel/sandbox", () => ({
  Sandbox: { create: mockSandboxCreate },
}));

vi.mock("bash-tool", () => ({
  createBashTool: mockCreateBashTool,
}));

vi.mock("@/lib/config", () => ({
  loadRepoConfig: vi.fn().mockResolvedValue({
    config: {
      autoFix: {
        enabled: true,
        commitDirectly: true,
        maxFixesPerRun: 10,
        requireValidation: true,
      },
      thresholds: {
        blockMerge: "CRITICAL",
        requestChanges: "HIGH",
        commentOnly: "MEDIUM",
      },
      ignorePaths: [],
      report: {
        generateInteractiveReport: true,
        frameworks: ["OWASP"],
      },
      model: {
        provider: "anthropic",
        model: "claude-sonnet-4.6",
        maxSteps: 30,
      },
      bot: {
        verbosity: "normal",
        autoSubscribe: true,
        language: "en",
      },
      scanning: {
        timeout: 10 * 60 * 1000,
        maxRetries: 1,
        enableDependencyAudit: true,
        enableSecretScan: true,
        maxSteps: 30,
        depth: "standard",
      },
      notifications: {
        commentStyle: "comment",
        minSeverityToComment: "INFO",
        suppressCleanReports: false,
        mentionAuthors: false,
      },
    },
    policies: [],
    configSource: "defaults",
    policiesSource: "defaults",
  }),
}));

vi.mock("../../lib/analysis/recon", () => ({
  runReconnaissance: mockRunReconnaissance,
}));

vi.mock("../../lib/analysis/security-scan", () => ({
  runSecurityScan: mockRunSecurityScan,
}));

vi.mock("../../lib/analysis/threat-synthesis", () => ({
  runThreatSynthesis: mockRunThreatSynthesis,
}));

vi.mock("@/lib/pipeline-eta", () => ({
  getEstimatedPipelineMs: vi.fn().mockResolvedValue(null),
  recordPipelineDurationMs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logAudit: vi.fn(),
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
    mockRunCommand.mockResolvedValue({
      stdout: vi.fn().mockResolvedValue("mock diff output"),
    });
    mockStop.mockResolvedValue(undefined);
    mockSandboxCreate.mockResolvedValue({
      runCommand: mockRunCommand,
      stop: mockStop,
    });
    mockRunReconnaissance.mockResolvedValue(defaultRecon);
    mockRunSecurityScan.mockResolvedValue(defaultScan);
    mockRunThreatSynthesis.mockResolvedValue(defaultThreat);
  });

  it("calls recon → security scan → threat synthesis in order", async () => {
    const order: string[] = [];
    mockRunReconnaissance.mockImplementation(async () => {
      order.push("recon");
      return defaultRecon;
    });
    mockRunSecurityScan.mockImplementation(async () => {
      order.push("scan");
      return defaultScan;
    });
    mockRunThreatSynthesis.mockImplementation(async () => {
      order.push("threat");
      return defaultThreat;
    });

    await runSecurityPipeline(defaultInput);

    expect(order).toEqual(["recon", "scan", "threat"]);
  });

  it("returns score, grade, summary, threatModel, recon, metadata", async () => {
    const result = await runSecurityPipeline(defaultInput);

    expect(result.grade).toBeDefined();
    expect(result.summary).toBe("Threat model complete");
    expect(result.threatModel?.attackPaths?.length).toBeGreaterThan(0);
    expect(result.recon?.languages).toContain("TypeScript");
    expect(result.metadata?.modelUsed).toBe("claude-sonnet-4.6");
  });

  it("calls onProgress with pipeline events", async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);

    await runSecurityPipeline(defaultInput, onProgress);

    const stages = onProgress.mock.calls.map((c) => c[0].stage);
    expect(stages).toContain("recon");
    expect(stages).toContain("security-scan");
    expect(stages).toContain("threat-synthesis");
    expect(stages).toContain("post-processing");
  });

  it("stops sandbox in finally block", async () => {
    await runSecurityPipeline(defaultInput);

    expect(mockStop).toHaveBeenCalled();
  });

  it("stops sandbox when recon throws", async () => {
    mockRunReconnaissance.mockRejectedValueOnce(new Error("recon failed"));

    await expect(runSecurityPipeline(defaultInput)).rejects.toThrow(
      "recon failed"
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
});
