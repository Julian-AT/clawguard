import { createGitHubAdapter } from "@chat-adapter/github";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createTeamsAdapter } from "@chat-adapter/teams";
import { createLinearAdapter } from "@chat-adapter/linear";

/**
 * Registers Chat SDK platform adapters based on environment variables.
 * GitHub is always enabled; others are optional.
 */
export function buildChatAdapters(botUsername: string): Record<string, unknown> {
  const adapters: Record<string, unknown> = {
    github: createGitHubAdapter({
      userName: botUsername,
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
