import type { Sandbox } from "@vercel/sandbox";
import type { Finding } from "@/lib/analysis/types";
import type { ApplyResult } from "@/lib/fix/types";
import { runValidation } from "@/lib/fix/validate";
import { ToolLoopAgent, Output, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { createBashTool } from "bash-tool";
import { z } from "zod";

const FixOutputSchema = z.object({
  fixedCode: z.string().describe("The complete fixed file content"),
  explanation: z.string().describe("What was changed and why"),
});

/**
 * Generate a fix using a ToolLoopAgent as a fallback when the stored
 * fix.before/fix.after fast path fails validation.
 *
 * The agent reads the full file context, understands the vulnerability,
 * and generates a fresh fix. The fix is validated in the sandbox before
 * being accepted. If validation fails, the original file is restored.
 */
export async function generateFixWithAgent(
  sandbox: Sandbox,
  finding: Finding,
  previousErrors: string
): Promise<ApplyResult> {
  try {
    const filePath = finding.location.file;

    // Read original file for potential restoration
    const originalBuffer = await sandbox.readFileToBuffer({ path: filePath });
    const originalContent = originalBuffer?.toString("utf-8") ?? "";

    // Create bash tools for the agent to explore the codebase
    const { tools } = await createBashTool({ sandbox });

    // Create the ToolLoopAgent for fix generation
    const agent = new ToolLoopAgent({
      model: gateway("anthropic/claude-sonnet-4.6"),
      tools,
      output: Output.object({ schema: FixOutputSchema }),
      stopWhen: stepCountIs(15),
      instructions: [
        "You are a security engineer fixing a vulnerability in a codebase.",
        "",
        `Finding type: ${finding.type}`,
        `CWE ID: ${finding.cweId}`,
        `File: ${finding.location.file}`,
        `Line: ${finding.location.line}`,
        `Severity: ${finding.severity}`,
        `Description: ${finding.description}`,
        "",
        `Previous fix attempt failed validation with these errors:`,
        previousErrors,
        "",
        "Instructions:",
        "1. Read the full file to understand the context",
        "2. Fix the specific vulnerability without changing unrelated code",
        "3. Maintain the existing code style and indentation",
        "4. Do not introduce new vulnerabilities",
        "5. Ensure the fix passes type checking and linting",
        "",
        "Return the complete fixed file content in fixedCode.",
      ].join("\n"),
    });

    // Run the agent
    const result = await agent.generate({
      prompt: `Fix the ${finding.type} vulnerability in ${finding.location.file}`,
    });

    const fixedCode = result.object.fixedCode;

    // Write the agent-generated fix to the sandbox
    await sandbox.writeFiles([
      { path: filePath, content: Buffer.from(fixedCode) },
    ]);

    // Validate the fix
    const validation = await runValidation(sandbox);

    if (validation.passed) {
      return {
        valid: true,
        content: fixedCode,
        errors: "",
      };
    }

    // Validation failed -- restore original file
    await sandbox.writeFiles([
      { path: filePath, content: Buffer.from(originalContent) },
    ]);

    return {
      valid: false,
      content: "",
      errors: validation.errors,
    };
  } catch (error) {
    return {
      valid: false,
      content: "",
      errors: error instanceof Error ? error.message : "Unknown agent error",
    };
  }
}
