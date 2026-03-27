import { after } from "next/server";
import { bot } from "@/lib/bot";
import { redis } from "@/lib/redis";

export const maxDuration = 300;

export async function POST(request: Request) {
  const deliveryId = request.headers.get("x-github-delivery");
  if (deliveryId) {
    const key = `webhook:delivery:${deliveryId}`;
    const isNew = await redis.set(key, "1", { nx: true, ex: 3600 });
    if (!isNew) {
      return new Response("OK", { status: 200 });
    }
  }

  const handler = bot.webhooks.github;
  if (!handler) {
    return new Response("GitHub adapter not configured", { status: 404 });
  }

  return handler(request, {
    waitUntil: (task) => after(() => task),
  });
}
