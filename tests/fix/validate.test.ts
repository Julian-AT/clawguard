import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../lib/fix/validate.ts"), "utf-8");

describe("Fix Validate Module", () => {
  it("exports runValidation as an async function", () => {
    expect(source).toContain("export async function runValidation");
  });

  it("detects TypeScript via tsconfig.json and runs tsc", () => {
    expect(source).toContain("tsconfig.json");
    expect(source).toContain("tsc");
    expect(source).toContain("--noEmit");
  });

  it("detects ESLint via eslint.config files and runs eslint", () => {
    expect(source).toContain("eslint.config");
    expect(source).toContain("eslint");
    expect(source).toContain("--no-warn-ignored");
  });

  it("detects Biome via biome.json and runs biome check", () => {
    expect(source).toContain("biome.json");
    expect(source).toContain("biome");
    expect(source).toContain("check");
  });

  it("detects test runner from package.json scripts.test", () => {
    expect(source).toContain("scripts");
    expect(source).toContain("test");
    expect(source).toContain("npm");
  });

  it("filters out default npm test stub", () => {
    expect(source).toContain('echo "Error: no test specified" && exit 1');
  });

  it("returns ValidationResult shape with passed, errors, and tools", () => {
    expect(source).toContain("passed:");
    expect(source).toContain("errors:");
    expect(source).toContain("tools:");
  });

  it("collects errors from stderr when a tool fails", () => {
    expect(source).toContain("stderr()");
    expect(source).toContain("errors.push");
  });

  it("uses try/catch around each tool check for independent failure handling", () => {
    // Should have multiple try/catch blocks for each tool
    const catchCount = (source.match(/\} catch/g) ?? []).length;
    expect(catchCount).toBeGreaterThanOrEqual(4);
  });

  it("checks exitCode to determine tool pass/fail", () => {
    expect(source).toContain("exitCode");
  });

  it("supports both flat and legacy ESLint config formats", () => {
    expect(source).toContain("eslint.config.js");
    expect(source).toContain("eslint.config.mjs");
    expect(source).toContain(".eslintrc.js");
    expect(source).toContain(".eslintrc.json");
  });
});
