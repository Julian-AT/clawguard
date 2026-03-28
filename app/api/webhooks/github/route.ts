import { after } from "next/server";
import { bot } from "@/lib/bot";
import { redis } from "@/lib/redis";

export const maxDuration = 300;

export async function POST(request: Request) {
  console.log("[webhook] POST received", request.headers.get("x-github-event"));

  // Clone request so we can peek at body without consuming the original
  const [forSdk, forPeek] = [request.clone(), request];
  const body = await forPeek.json();

  // Ignore comments made by bots (prevents infinite loop)
  if (body.sender?.type === "Bot" || body.comment?.user?.type === "Bot") {
    console.log("[webhook] Ignoring bot comment from:", body.sender?.login);
    return new Response("OK", { status: 200 });
  }

  const deliveryId = forSdk.headers.get("x-github-delivery");
  if (deliveryId) {
    const key = `webhook:delivery:${deliveryId}`;
    const isNew = await redis.set(key, "1", { nx: true, ex: 3600 });
    if (!isNew) {
      console.log("[webhook] Duplicate delivery, skipping:", deliveryId);
      return new Response("OK", { status: 200 });
    }
  }

  const handler = bot.webhooks.github;
  if (!handler) {
    console.log("[webhook] No GitHub handler found");
    return new Response("GitHub adapter not configured", { status: 404 });
  }

  console.log("[webhook] Delegating to Chat SDK handler");
  return handler(forSdk, {
    waitUntil: (task) => {
      after(() => {
        Promise.resolve(task).catch((err) =>
          console.error("[webhook] Background task error:", err)
        );
      });
    },
  });
}
