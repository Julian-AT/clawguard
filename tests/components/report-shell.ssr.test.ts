import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ReportShell } from "@/components/report/report-shell";

describe("ReportShell (SSR smoke)", () => {
  it("includes repo and PR in header", () => {
    const html = renderToString(
      createElement(
        ReportShell,
        { owner: "acme", repo: "app", prNumber: 42 },
        createElement("div", null, "content")
      )
    );
    // React SSR inserts comment nodes between text segments
    expect(html).toMatch(/acme.*\/.*app.*#.*42/);
    expect(html).toContain("ClawGuard");
  });
});
