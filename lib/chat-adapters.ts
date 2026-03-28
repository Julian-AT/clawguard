import { createGitHubAdapter } from "@chat-adapter/github";
import { createLinearAdapter } from "@chat-adapter/linear";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createTeamsAdapter } from "@chat-adapter/teams";

/**
 * Registers Chat SDK platform adapters based on environment variables.
 * GitHub is always enabled; others are optional.
 */
export function buildChatAdapters(botUsername: string): Record<string, unknown> {
  const adapters: Record<string, unknown> = {
    github: createGitHubAdapter({
      userName: botUsername,
      // When GITHUB_TOKEN is set, the adapter uses it before GitHub App credentials.
      // users.getAuthenticated() then returns the token owner, and the adapter treats
      // that id as "self" and ignores all comments from that user — including @mentions.
      // GitHub App–only installs use installation auth; App comments are filtered in
      // app/api/webhooks/github/route.ts (type Bot). -1 disables the broken self filter for PAT.
      ...(process.env.GITHUB_TOKEN ? { botUserId: -1 } : {}),
    }),
  };

  if (process.env.SLACK_BOT_TOKEN) {
    adapters.slack = createSlackAdapter({
      botToken: process.env.SLACK_BOT_TOKEN,
    });
  }

  if (process.env.TEAMS_APP_ID && process.env.TEAMS_APP_PASSWORD) {
    adapters.teams = createTeamsAdapter({
      appId: process.env.TEAMS_APP_ID,
      appPassword: process.env.TEAMS_APP_PASSWORD,
      appTenantId: process.env.TEAMS_APP_TENANT_ID,
      userName: botUsername,
    });
  }

  if (
    process.env.LINEAR_API_KEY ||
    process.env.LINEAR_ACCESS_TOKEN ||
    (process.env.LINEAR_CLIENT_ID && process.env.LINEAR_CLIENT_SECRET)
  ) {
    adapters.linear = createLinearAdapter({});
  }

  return adapters;
}
