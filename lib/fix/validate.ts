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

const DEFAULT_TEST_STUB = 'echo "Error: no test specified" && exit 1';

export async function runValidation(sandbox: Sandbox): Promise<ValidationResult> {
  const detected: string[] = [];
  const errors: string[] = [];

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
  } catch {}

  try {
    for (const config of ESLINT_CONFIGS) {
      const check = await sandbox.runCommand("ls", [config]);
      if (check.exitCode === 0) {
        detected.push("eslint");
        const eslint = await sandbox.runCommand("npx", ["eslint", "--no-warn-ignored", "."]);
        if (eslint.exitCode !== 0) {
          const stderr = await eslint.stderr();
          errors.push(`eslint: ${stderr}`);
        }
        break;
      }
    }
  } catch {}

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
  } catch {}

  try {
    const pkgCheck = await sandbox.runCommand("cat", ["package.json"]);
    if (pkgCheck.exitCode === 0) {
      const stdout = await pkgCheck.stdout();
      const pkg = JSON.parse(stdout);
      if (pkg.scripts?.test && pkg.scripts.test !== DEFAULT_TEST_STUB) {
        detected.push("test");
        const test = await sandbox.runCommand("npm", ["test"]);
        if (test.exitCode !== 0) {
          const stderr = await test.stderr();
          errors.push(`test: ${stderr}`);
        }
      }
    }
  } catch {}

  return {
    passed: errors.length === 0,
    errors: errors.join("\n"),
    tools: detected,
  };
}
