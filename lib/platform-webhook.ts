import { after } from "next/server";

type Platform = "slack" | "discord" | "teams" | "linear";

export async function handleChatPlatformWebhook(
  request: Request,
  platform: Platform
): Promise<Response> {
  const { bot } = await import("@/lib/bot");
  const handler = bot.webhooks[platform];
  if (!handler) {
    return new Response(`${platform} adapter not configured`, { status: 404 });
  }
  return handler(request, {
    waitUntil: (task) => {
      after(() => {
        Promise.resolve(task).catch((err) =>
          console.error(`[webhook] ${platform} background error:`, err)
        );
      });
    },
  });
}
