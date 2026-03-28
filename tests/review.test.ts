import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuditResult } from "../lib/analysis/types";

// Use vi.hoisted for mock variables used in vi.mock factories
const { mockRunSecurityPipeline } = vi.hoisted(() => {
  const mockAuditResult: AuditResult = {
    phases: {
      quality: {
        summary: "No quality issues",
        findings: [],
      },
      vulnerability: {
        summary: "No vulnerabilities",
        findings: [],
      },
      threatModel: {
        summary: "No threats",
        findings: [],
      },
    },
    allFindings: [],
    score: 100,
    grade: "A",
    severityCounts: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    },
  };

  const mockRunSecurityPipeline = vi
    .fn()
    .mockResolvedValue(mockAuditResult);

  return { mockRunSecurityPipeline };
});

vi.mock("../lib/analysis/pipeline", () => ({
  runSecurityPipeline: mockRunSecurityPipeline,
}));

import { reviewPullRequest } from "../lib/review";

describe("Review Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reviewPullRequest returns AuditResult", async () => {
    const result = await reviewPullRequest({
      owner: "test-owner",
      repo: "test-repo",
      prBranch: "feature/test",
      baseBranch: "main",
    });

    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("grade");
    expect(result).toHaveProperty("allFindings");
    expect(result).toHaveProperty("phases");
    expect(result.score).toBe(100);
    expect(result.grade).toBe("A");
    expect(result.allFindings).toEqual([]);
    expect(result.phases.quality.summary).toBe("No quality issues");
    expect(result.phases.vulnerability.summary).toBe("No vulnerabilities");
    expect(result.phases.threatModel.summary).toBe("No threats");
  });

  it("reviewPullRequest passes onProgress to pipeline", async () => {
    const onProgress = vi.fn().mockResolvedValue(undefined);

    await reviewPullRequest(
      {
        owner: "test-owner",
        repo: "test-repo",
        prBranch: "feature/test",
        baseBranch: "main",
      },
      onProgress
    );

    expect(mockRunSecurityPipeline).toHaveBeenCalledWith(
      {
        owner: "test-owner",
        repo: "test-repo",
        prBranch: "feature/test",
        baseBranch: "main",
      },
      onProgress
    );
  });

  it("reviewPullRequest delegates to runSecurityPipeline", async () => {
    await reviewPullRequest({
      owner: "test-owner",
      repo: "test-repo",
      prBranch: "feature/test",
      baseBranch: "main",
    });

    expect(mockRunSecurityPipeline).toHaveBeenCalledTimes(1);
    expect(mockRunSecurityPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "test-owner",
        repo: "test-repo",
      }),
      undefined
    );
  });
});
