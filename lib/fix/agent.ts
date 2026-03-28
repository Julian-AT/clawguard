import { gateway } from "@ai-sdk/gateway";
import type { Sandbox } from "@vercel/sandbox";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { createBashTool } from "bash-tool";
import { z } from "zod";
import type { Finding } from "@/lib/analysis/types";
import type { ApplyResult } from "@/lib/fix/types";
import { runValidation } from "@/lib/fix/validate";

const FixOutputSchema = z.object({
  fixedCode: z.string().describe("The complete fixed file content"),
  explanation: z.string().describe("What was changed and why"),
});

export async function generateFixWithAgent(
  sandbox: Sandbox,
  finding: Finding,
  previousErrors: string,
  options?: { reconSnippet?: string },
): Promise<ApplyResult> {
  try {
    const filePath = finding.file;

    const originalBuffer = await sandbox.readFileToBuffer({ path: filePath });
    const originalContent = originalBuffer?.toString("utf-8") ?? "";

    const { tools } = await createBashTool({ sandbox });

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
        `File: ${finding.file}`,
        `Line: ${finding.line}`,
        `Severity: ${finding.severity}`,
        `Description: ${finding.description}`,
        "",
        options?.reconSnippet
          ? `Repository / PR context:\n${options.reconSnippet.slice(0, 12_000)}`
          : "",
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

    const result = await agent.generate({
      prompt: `Fix the ${finding.type} vulnerability in ${finding.file}`,
    });

    const fixedCode = result.output.fixedCode;

    await sandbox.writeFiles([{ path: filePath, content: Buffer.from(fixedCode) }]);

    const validation = await runValidation(sandbox);

    if (validation.passed) {
      return {
        valid: true,
        content: fixedCode,
        errors: "",
      };
    }

    await sandbox.writeFiles([{ path: filePath, content: Buffer.from(originalContent) }]);

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
