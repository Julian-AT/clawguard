import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAfter, mockWebhookHandler, mockRedisSet, mockRedisGet } = vi.hoisted(() => ({
  mockAfter: vi.fn((fn: () => void) => fn()),
  mockWebhookHandler: vi.fn().mockResolvedValue(new Response("OK", { status: 200 })),
  mockRedisSet: vi.fn().mockResolvedValue("OK"),
  mockRedisGet: vi.fn().mockResolvedValue(null),
}));

vi.mock("next/server", () => ({
  after: mockAfter,
}));

vi.mock("@/lib/bot", () => ({
  bot: {
    webhooks: {
      github: mockWebhookHandler,
    },
  },
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    set: mockRedisSet,
    get: mockRedisGet,
  },
}));

import { maxDuration, POST } from "@/app/api/webhooks/github/route";

describe("Webhook Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisSet.mockResolvedValue("OK");
    mockWebhookHandler.mockResolvedValue(new Response("OK", { status: 200 }));
  });

  it("routes POST request to Chat SDK handler (HOOK-01)", async () => {
    const request = new Request("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-github-delivery": "test-delivery-123",
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "created" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockWebhookHandler).toHaveBeenCalled();
  });

  it("passes waitUntil option that uses after() (HOOK-03)", async () => {
    const request = new Request("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-github-delivery": "test-delivery-456",
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "created" }),
    });

    await POST(request);

    expect(mockWebhookHandler).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        waitUntil: expect.any(Function),
      }),
    );
  });

  it("delegates signature verification to Chat SDK (HOOK-04)", async () => {
    const request = new Request("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-github-delivery": "test-delivery-789",
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "created" }),
    });

    await POST(request);

    const passedRequest = mockWebhookHandler.mock.calls[0][0];
    expect(passedRequest).toBeInstanceOf(Request);
    expect(passedRequest.url).toBe(request.url);
    expect(passedRequest.method).toBe(request.method);
  });

  it("deduplicates via X-GitHub-Delivery + Redis SETNX (HOOK-05)", async () => {
    mockRedisSet.mockResolvedValueOnce("OK");

    const request1 = new Request("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-github-delivery": "duplicate-id-001",
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "created" }),
    });

    const response1 = await POST(request1);
    expect(response1.status).toBe(200);
    expect(mockWebhookHandler).toHaveBeenCalledTimes(1);

    mockWebhookHandler.mockClear();
    mockRedisSet.mockResolvedValueOnce(null);

    const request2 = new Request("http://localhost/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-github-delivery": "duplicate-id-002",
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "created" }),
    });

    const response2 = await POST(request2);
    expect(response2.status).toBe(200);
    expect(mockWebhookHandler).not.toHaveBeenCalled();
  });

  it("exports maxDuration = 300", () => {
    expect(maxDuration).toBe(300);
  });
});
