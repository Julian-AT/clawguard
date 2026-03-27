import { Chat } from "chat";
import { createGitHubAdapter } from "@chat-adapter/github";
import type { GitHubRawMessage } from "@chat-adapter/github";
import { createRedisState } from "@chat-adapter/state-redis";
import { Octokit } from "@octokit/rest";
import { reviewPullRequest } from "./review";
import { storeAuditResult } from "./redis";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export const bot = new Chat({
  userName: process.env.GITHUB_BOT_USERNAME || "clawguard",
  adapters: {
    github: createGitHubAdapter(),
  },
  state: createRedisState(),
});

bot.onNewMention(async (thread, message) => {
  const raw = message.raw as GitHubRawMessage;
  const owner = raw.repository.owner.login;
  const repo = raw.repository.name;
  const prNumber = raw.prNumber;

  await thread.post(
    `\u{1F50D} Starting security review for PR #${prNumber}...`
  );
  await thread.subscribe();

  try {
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const reviewResult = await reviewPullRequest({
      owner,
      repo,
      prBranch: pr.head.ref,
      baseBranch: pr.base.ref,
    });

    await storeAuditResult({
      key: `${owner}/${repo}/pr/${prNumber}`,
      data: {
        result: reviewResult,
        timestamp: new Date().toISOString(),
        pr: { owner, repo, number: prNumber, title: pr.title },
        status: "complete",
      },
    });

    await thread.post(
      `\u2705 Security review complete for PR #${prNumber}. Results stored.`
    );
  } catch (error) {
    await thread.post(
      "Something went wrong during the security review. Please try again."
    );
  }
});

bot.onSubscribedMessage(async (thread, message) => {
  await thread.post(
    "I've already reviewed this PR. @mention me on a new PR to start another review."
  );
});
