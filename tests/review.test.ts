import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditResult } from "../lib/analysis/types";

// Use vi.hoisted for mock variables used in vi.mock factories
const { mockRunSecurityPipeline } = vi.hoisted(() => {
  const mockAuditResult: AuditResult = {
    summary: "Clean bill of health",
    threatModel: {
      attackSurfaces: [],
      attackPaths: [],
      strideCategorization: [],
      trustBoundaries: [],
      riskMatrix: [],
    },
    phases: [
      { phase: "code-quality", summary: "No quality issues", findings: [] },
      { phase: "vulnerability-scan", summary: "No vulnerabilities", findings: [] },
      { phase: "threat-model", summary: "No threats", findings: [] },
    ],
    findings: [],
    score: 100,
    grade: "A",
  };

  const mockRunSecurityPipeline = vi.fn().mockResolvedValue(mockAuditResult);

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
    expect(result).toHaveProperty("findings");
    expect(result).toHaveProperty("phases");
    expect(result.score).toBe(100);
    expect(result.grade).toBe("A");
    expect(result.findings).toEqual([]);
    expect(result.phases?.[0]?.summary).toBe("No quality issues");
    expect(result.phases?.[1]?.summary).toBe("No vulnerabilities");
    expect(result.phases?.[2]?.summary).toBe("No threats");
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
      onProgress,
    );

    expect(mockRunSecurityPipeline).toHaveBeenCalledWith(
      {
        owner: "test-owner",
        repo: "test-repo",
        prBranch: "feature/test",
        baseBranch: "main",
      },
      onProgress,
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
      undefined,
    );
  });
});
