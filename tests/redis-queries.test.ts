import { describe, expect, it } from "vitest";
import { isAuditStorageKey } from "@/lib/redis-queries";

describe("isAuditStorageKey", () => {
  it("accepts audit JSON keys", () => {
    expect(isAuditStorageKey("abdulbb/webgoat-honeypot/pr/6")).toBe(true);
    expect(isAuditStorageKey("Julian-AT/clawguard/pr/1")).toBe(true);
  });

  it("rejects stream LIST keys that collide with SCAN patterns", () => {
    expect(isAuditStorageKey("stream:abdulbb/webgoat-honeypot/pr/6")).toBe(false);
  });

  it("rejects predictions-prefixed keys", () => {
    expect(isAuditStorageKey("predictions:abdulbb/webgoat-honeypot/pr/6")).toBe(false);
  });
});
