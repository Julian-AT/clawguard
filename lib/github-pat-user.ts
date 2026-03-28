import { Octokit } from "@octokit/rest";

let cachedTokenUserId: number | null | undefined;

/**
 * Numeric GitHub user id for `GITHUB_TOKEN` (PAT). Used to filter our own API
 * comments when the adapter cannot use installation bot identity.
 */
export async function getGithubTokenUserId(): Promise<number | null> {
  if (!process.env.GITHUB_TOKEN) {
    return null;
  }
  if (cachedTokenUserId !== undefined) {
    return cachedTokenUserId;
  }
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const { data } = await octokit.users.getAuthenticated();
    cachedTokenUserId = data.id;
    return cachedTokenUserId;
  } catch {
    cachedTokenUserId = null;
    return null;
  }
}
