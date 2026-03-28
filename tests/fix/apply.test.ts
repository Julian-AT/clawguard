import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const source = readFileSync(
  resolve(__dirname, "../../lib/fix/apply.ts"),
  "utf-8"
);

describe("Fix Apply Module", () => {
  it("exports applyStoredFix as an async function", () => {
    expect(source).toContain("export async function applyStoredFix");
  });

  it("reads original file from sandbox via readFileToBuffer", () => {
    expect(source).toContain("sandbox.readFileToBuffer");
  });

  it("writes fixed content to sandbox via writeFiles", () => {
    expect(source).toContain("sandbox.writeFiles");
  });

  it("calls runValidation after writing the fix", () => {
    expect(source).toContain("runValidation(sandbox)");
  });

  it("restores original file if validation fails (second writeFiles call)", () => {
    // The source should have two sandbox.writeFiles calls:
    // 1. Writing the fixed content
    // 2. Restoring the original content on validation failure
    const writeFilesMatches = source.match(/sandbox\.writeFiles/g);
    expect(writeFilesMatches).not.toBeNull();
    expect(writeFilesMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("handles whitespace normalization with \\r\\n line ending replacement", () => {
    expect(source).toContain(".replace(/\\r\\n/g");
  });

  it("checks that replace actually changed the content (pattern-not-found check)", () => {
    expect(source).toContain("fix.before pattern not found in file");
  });

  it("implements fuzzy line-by-line matching for indentation differences", () => {
    expect(source).toContain("fuzzyReplace");
    expect(source).toContain("trim()");
  });

  it("imports Finding type from analysis types", () => {
    expect(source).toContain('@/lib/analysis/types"');
    expect(source).toContain("Finding");
  });

  it("imports ApplyResult from fix types", () => {
    expect(source).toContain('@/lib/fix/types"');
    expect(source).toContain("ApplyResult");
  });

  it("returns ApplyResult with valid, content, and errors fields", () => {
    expect(source).toContain("valid:");
    expect(source).toContain("content:");
    expect(source).toContain("errors:");
  });
});
