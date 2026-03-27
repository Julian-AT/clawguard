import { Sandbox } from "@vercel/sandbox";
import { ToolLoopAgent, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { createBashTool } from "bash-tool";

export interface ReviewInput {
  owner: string;
  repo: string;
  prBranch: string;
  baseBranch: string;
}

export async function reviewPullRequest(input: ReviewInput): Promise<string> {
  const sandbox = await Sandbox.create({
    source: {
      type: "git",
      url: `https://github.com/${input.owner}/${input.repo}`,
      username: "x-access-token",
      password: process.env.GITHUB_TOKEN!,
      depth: 50,
    },
    timeout: 5 * 60 * 1000,
  });

  try {
    await sandbox.runCommand("git", [
      "fetch",
      "origin",
      input.prBranch,
      input.baseBranch,
    ]);
    await sandbox.runCommand("git", ["checkout", input.prBranch]);

    const diffResult = await sandbox.runCommand("git", [
      "diff",
      `origin/${input.baseBranch}...HEAD`,
    ]);
    const diff = await diffResult.stdout();

    const { tools } = await createBashTool({ sandbox });

    const agent = new ToolLoopAgent({
      model: gateway("anthropic/claude-sonnet-4.6"),
      tools,
      stopWhen: stepCountIs(20),
    });

    const result = await agent.generate({
      prompt: [
        "You are a security code reviewer. Analyze this pull request diff for security vulnerabilities.",
        "Focus on: injection flaws, hardcoded secrets, auth gaps, CSRF, IDOR, path traversal, unsafe eval, data exposure.",
        "Provide a brief security summary with any findings.",
        "",
        "<diff>",
        diff,
        "</diff>",
      ].join("\n"),
    });

    return result.text;
  } finally {
    await sandbox.stop();
  }
}
