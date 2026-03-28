import { describe, it, expect } from "vitest";
import { postProcessAudit } from "@/lib/analysis/post-process";
import { DEFAULT_CLAWGUARD_CONFIG } from "@/lib/config/defaults";
import type { Finding, ThreatModel } from "@/lib/analysis/types";
import { parseChangedFilesFromDiff } from "@/lib/analysis/recon";

describe("golden pipeline helpers", () => {
  it("parses changed files from a minimal diff", () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
index 111..222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1 +1 @@
`;
    const paths = parseChangedFilesFromDiff(diff);
    expect(paths).toContain("src/a.ts");
  });

  it("post-process scores findings and filters to recon paths", () => {
    const recon = {
      changedFiles: [{ path: "src/x.ts" }],
      languages: ["TypeScript"],
      frameworkHints: [],
      diff: "",
    };

    const findings: Finding[] = [
      {
        severity: "HIGH",
        type: "xss",
        file: "src/x.ts",
        line: 1,
        cweId: "CWE-79",
        owaspCategory: "A03:2021-Injection",
        description: "d",
        attackScenario: "a",
        confidence: "HIGH",
      },
      {
        severity: "CRITICAL",
        type: "fake",
        file: "ghost.ts",
        line: 1,
        cweId: "CWE-000",
        owaspCategory: "A03:2021-Injection",
        description: "d",
        attackScenario: "a",
        confidence: "HIGH",
      },
    ];

    const threatModel: ThreatModel = {
      attackSurfaces: [],
      attackPaths: [],
    };

    const out = postProcessAudit({
      findings,
      threatModel,
      summary: "test",
      recon,
      config: DEFAULT_CLAWGUARD_CONFIG,
    });

    expect(out.findings).toHaveLength(1);
    expect(out.findings[0].file).toBe("src/x.ts");
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(100);
    expect(out.grade.length).toBeGreaterThan(0);
  });
});
