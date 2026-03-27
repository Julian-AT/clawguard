import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const source = readFileSync(
  resolve(__dirname, "../../lib/fix/commit.ts"),
  "utf-8"
);

describe("Fix Commit Module", () => {
  it("exports commitFixToGitHub as an async function", () => {
    expect(source).toContain("export async function commitFixToGitHub");
  });

  it("calls repos.getContent for SHA retrieval", () => {
    expect(source).toContain("repos.getContent");
  });

  it("calls repos.createOrUpdateFileContents for commit", () => {
    expect(source).toContain("repos.createOrUpdateFileContents");
  });

  it("commit message contains fix(security): prefix", () => {
    expect(source).toContain("fix(security):");
  });

  it("uses Base64 encoding for file content", () => {
    expect(source).toContain('toString("base64")');
  });

  it("sets committer to ClawGuard Bot", () => {
    expect(source).toContain("ClawGuard Bot");
    expect(source).toContain("clawguard[bot]@users.noreply.github.com");
  });

  it("returns commit SHA from the result", () => {
    expect(source).toContain("commit.sha");
  });

  it("handles directory path error with Array.isArray guard", () => {
    expect(source).toContain("Array.isArray");
    expect(source).toContain("directory");
  });

  it("includes finding type and CWE ID in commit message", () => {
    expect(source).toContain("finding.type");
    expect(source).toContain("finding.cweId");
  });

  it("includes finding severity and location in commit body", () => {
    expect(source).toContain("finding.severity");
    expect(source).toContain("finding.location.line");
  });

  it("passes the branch parameter to both API calls", () => {
    expect(source).toContain("ref: params.branch");
    expect(source).toContain("branch: params.branch");
  });

  it("uses currentFile.sha from getContent response", () => {
    expect(source).toContain("currentFile.sha");
  });
});
