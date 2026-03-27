import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to declare mocks that are accessible in vi.mock factories
const { mockSet, mockGet } = vi.hoisted(() => ({
  mockSet: vi.fn().mockResolvedValue("OK"),
  mockGet: vi.fn().mockResolvedValue(null),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class MockRedis {
    set = mockSet;
    get = mockGet;
    constructor() {}
  },
}));

import { storeAuditResult, getAuditResult } from "../lib/redis";
import type { AuditData } from "../lib/redis";

describe("Redis Audit Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores audit data at the correct key (SCAN-07)", async () => {
    const data: AuditData = {
      result: "No vulnerabilities found.",
      timestamp: "2026-03-27T00:00:00.000Z",
      pr: {
        owner: "test-owner",
        repo: "test-repo",
        number: 1,
        title: "Test PR",
      },
      status: "complete",
    };

    await storeAuditResult({ key: "test-owner/test-repo/pr/1", data });

    expect(mockSet).toHaveBeenCalledWith(
      "test-owner/test-repo/pr/1",
      expect.any(String)
    );

    const storedJson = mockSet.mock.calls[0][1];
    const parsed = JSON.parse(storedJson);
    expect(parsed.result).toBe("No vulnerabilities found.");
    expect(parsed.pr.owner).toBe("test-owner");
    expect(parsed.status).toBe("complete");
  });

  it("retrieves stored audit data by key (SCAN-07)", async () => {
    const storedData: AuditData = {
      result: "Found 2 vulnerabilities.",
      timestamp: "2026-03-27T00:00:00.000Z",
      pr: { owner: "owner", repo: "repo", number: 42, title: "Fix auth" },
      status: "complete",
    };
    mockGet.mockResolvedValueOnce(JSON.stringify(storedData));

    const result = await getAuditResult("owner/repo/pr/42");

    expect(result).not.toBeNull();
    expect(result!.status).toBe("complete");
    expect(result!.pr.number).toBe(42);
    expect(result!.pr.owner).toBe("owner");
    expect(result!.result).toBe("Found 2 vulnerabilities.");
  });

  it("returns null for missing key (SCAN-07)", async () => {
    mockGet.mockResolvedValueOnce(null);

    const result = await getAuditResult("nonexistent/key");

    expect(result).toBeNull();
  });
});
