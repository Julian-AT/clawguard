import { after } from "next/server";
import { redis } from "@/lib/redis";

export const maxDuration = 300;

export async function POST(request: Request) {
  console.log("[webhook] POST received", request.headers.get("x-github-event"));

  const [forSdk, forPeek] = [request.clone(), request];
  let body: Record<string, unknown>;
  try {
    body = (await forPeek.json()) as Record<string, unknown>;
  } catch (e) {
    console.error("[webhook] Invalid JSON body:", e);
    return new Response("Bad Request", { status: 400 });
  }

  const sender = body.sender as Record<string, unknown> | undefined;
  const comment = body.comment as Record<string, unknown> | undefined;
  const commentUser = comment?.user as Record<string, unknown> | undefined;
  if (sender?.type === "Bot" || commentUser?.type === "Bot") {
    console.log("[webhook] Ignoring bot comment from:", sender?.login);
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

  try {
    const { bot } = await import("@/lib/bot");
    const handler = bot.webhooks.github;
    if (!handler) {
      console.error("[webhook] No GitHub handler on Chat instance");
      return new Response("GitHub adapter not configured", { status: 404 });
    }

    return await handler(forSdk, {
      waitUntil: (task) => {
        after(() => {
          Promise.resolve(task).catch((err) =>
            console.error("[webhook] Background task error:", err)
          );
        });
      },
    });
  } catch (err) {
    console.error("[webhook] Chat SDK or bot init failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
