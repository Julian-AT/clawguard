import type { Sandbox } from "@vercel/sandbox";
import type { ValidationResult } from "@/lib/fix/types";

const ESLINT_CONFIGS = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.ts",
  ".eslintrc.js",
  ".eslintrc.json",
  ".eslintrc.yml",
];

const DEFAULT_TEST_STUB =
  'echo "Error: no test specified" && exit 1';

/**
 * Auto-detect available validation tools in the sandbox and run all of them.
 *
 * Detection order:
 * 1. TypeScript (tsconfig.json) -> npx tsc --noEmit
 * 2. ESLint (eslint.config.* or .eslintrc.*) -> npx eslint --no-warn-ignored .
 * 3. Biome (biome.json) -> npx biome check .
 * 4. Test suite (package.json scripts.test) -> npm test
 *
 * Validation passes only when ALL detected tools pass (D-09).
 * Each tool is independently try/caught so one failure doesn't prevent others from running.
 */
export async function runValidation(
  sandbox: Sandbox
): Promise<ValidationResult> {
  const detected: string[] = [];
  const errors: string[] = [];

  // 1. Check for TypeScript
  try {
    const tscCheck = await sandbox.runCommand("ls", ["tsconfig.json"]);
    if (tscCheck.exitCode === 0) {
      detected.push("tsc");
      const tsc = await sandbox.runCommand("npx", ["tsc", "--noEmit"]);
      if (tsc.exitCode !== 0) {
        const stderr = await tsc.stderr();
        errors.push(`tsc: ${stderr}`);
      }
    }
  } catch {
    // TypeScript detection failed, skip
  }

  // 2. Check for ESLint (flat config or legacy)
  try {
    for (const config of ESLINT_CONFIGS) {
      const check = await sandbox.runCommand("ls", [config]);
      if (check.exitCode === 0) {
        detected.push("eslint");
        const eslint = await sandbox.runCommand("npx", [
          "eslint",
          "--no-warn-ignored",
          ".",
        ]);
        if (eslint.exitCode !== 0) {
          const stderr = await eslint.stderr();
          errors.push(`eslint: ${stderr}`);
        }
        break;
      }
    }
  } catch {
    // ESLint detection failed, skip
  }

  // 3. Check for Biome
  try {
    const biomeCheck = await sandbox.runCommand("ls", ["biome.json"]);
    if (biomeCheck.exitCode === 0) {
      detected.push("biome");
      const biome = await sandbox.runCommand("npx", ["biome", "check", "."]);
      if (biome.exitCode !== 0) {
        const stderr = await biome.stderr();
        errors.push(`biome: ${stderr}`);
      }
    }
  } catch {
    // Biome detection failed, skip
  }

  // 4. Check for test runner via package.json
  try {
    const pkgCheck = await sandbox.runCommand("cat", ["package.json"]);
    if (pkgCheck.exitCode === 0) {
      const stdout = await pkgCheck.stdout();
      const pkg = JSON.parse(stdout);
      if (
        pkg.scripts?.test &&
        pkg.scripts.test !== DEFAULT_TEST_STUB
      ) {
        detected.push("test");
        const test = await sandbox.runCommand("npm", ["test"]);
        if (test.exitCode !== 0) {
          const stderr = await test.stderr();
          errors.push(`test: ${stderr}`);
        }
      }
    }
  } catch {
    // Test detection failed, skip
  }

  return {
    passed: errors.length === 0,
    errors: errors.join("\n"),
    tools: detected,
  };
}
