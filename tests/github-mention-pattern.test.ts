import { describe, expect, it } from "vitest";
import {
  buildGithubMentionFallbackPattern,
  collectBotMentionHandles,
  commentBodyMentionsBot,
} from "@/lib/github-mention-pattern";

describe("github-mention-pattern", () => {
  it("adds clawguardbot when primary is clawguard", () => {
    const h = collectBotMentionHandles("clawguard");
    expect(h).toContain("clawguard");
    expect(h).toContain("clawguardbot");
  });

  it("matches @clawguardbot when primary is clawguard", () => {
    const re = buildGithubMentionFallbackPattern(collectBotMentionHandles("clawguard"));
    expect(re.test("\r\n@clawguardbot analyize this pr\r\n")).toBe(true);
  });

  it("does not match @clawguardbot when only clawguard is in pattern", () => {
    const re = buildGithubMentionFallbackPattern(["clawguard"]);
    expect(re.test("@clawguardbot hello")).toBe(false);
  });

  it("commentBodyMentionsBot uses raw body (same as user webhook)", () => {
    const body = "\r\n@clawguardbot analyize this pr\r\n\r\n";
    expect(commentBodyMentionsBot(body, ["clawguardbot"])).toBe(true);
  });
});
