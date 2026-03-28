import { redis } from "@/lib/redis";

export async function pushStreamEvent(
  channelKey: string,
  event: string,
  payload: unknown
): Promise<void> {
  await redis.rpush(channelKey, JSON.stringify({ event, payload }));
  await redis.expire(channelKey, 3600);
}

export function getStreamKey(owner: string, repo: string, pr: number): string {
  return `stream:${owner}/${repo}/pr/${pr}`;
}
