import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted for mock variables used in vi.mock factories
const {
  mockRunCommand,
  mockStop,
  mockSandboxCreate,
  mockGenerate,
  mockToolLoopAgent,
  mockStepCountIs,
  mockGateway,
} = vi.hoisted(() => {
  const mockRunCommand = vi.fn().mockResolvedValue({
    stdout: vi.fn().mockResolvedValue("mock diff output"),
  });
  const mockStop = vi.fn().mockResolvedValue(undefined);
  const mockSandboxCreate = vi.fn().mockResolvedValue({
    runCommand: mockRunCommand,
    stop: mockStop,
  });
  const mockGenerate = vi.fn().mockResolvedValue({
    text: "No vulnerabilities found.",
  });
  // Use regular function (not arrow) so it works as a constructor with `new`
  const mockToolLoopAgent = vi.fn().mockImplementation(function () {
    return { generate: mockGenerate };
  });
  const mockStepCountIs = vi.fn().mockReturnValue(() => false);
  const mockGateway = vi.fn().mockReturnValue("mock-model");

  return {
    mockRunCommand,
    mockStop,
    mockSandboxCreate,
    mockGenerate,
    mockToolLoopAgent,
    mockStepCountIs,
    mockGateway,
  };
});

vi.mock("@vercel/sandbox", () => ({
  Sandbox: {
    create: mockSandboxCreate,
  },
}));

vi.mock("bash-tool", () => ({
  createBashTool: vi.fn().mockResolvedValue({ tools: {} }),
}));

vi.mock("ai", () => ({
  ToolLoopAgent: mockToolLoopAgent,
  stepCountIs: mockStepCountIs,
}));

vi.mock("@ai-sdk/gateway", () => ({
  gateway: mockGateway,
}));

import { reviewPullRequest } from "../lib/review";

describe("Review Pipeline", () => {
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
    mockGenerate.mockResolvedValue({
      text: "No vulnerabilities found.",
    });
    mockToolLoopAgent.mockImplementation(function () {
      return { generate: mockGenerate };
    });
    mockGateway.mockReturnValue("mock-model");
  });

  it("creates Sandbox with git source containing repo URL (SCAN-01)", async () => {
    await reviewPullRequest({
      owner: "test-owner",
      repo: "test-repo",
      prBranch: "feature/test",
      baseBranch: "main",
    });

    expect(mockSandboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          type: "git",
          url: expect.stringContaining("test-owner/test-repo"),
        }),
      })
    );
  });

  it("uses AI Gateway model via ToolLoopAgent (SCAN-08)", async () => {
    await reviewPullRequest({
      owner: "test-owner",
      repo: "test-repo",
      prBranch: "feature/test",
      baseBranch: "main",
    });

    expect(mockGateway).toHaveBeenCalledWith("anthropic/claude-sonnet-4.6");
    expect(mockToolLoopAgent).toHaveBeenCalled();
  });

  it("cleans up sandbox in finally block (SCAN-01)", async () => {
    await reviewPullRequest({
      owner: "test-owner",
      repo: "test-repo",
      prBranch: "feature/test",
      baseBranch: "main",
    });

    expect(mockStop).toHaveBeenCalled();
  });

  it("returns agent result text", async () => {
    const result = await reviewPullRequest({
      owner: "test-owner",
      repo: "test-repo",
      prBranch: "feature/test",
      baseBranch: "main",
    });

    expect(result).toBe("No vulnerabilities found.");
  });
});
