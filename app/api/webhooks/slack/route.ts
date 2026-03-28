import { handleChatPlatformWebhook } from "@/lib/platform-webhook";

export const maxDuration = 300;

export async function POST(request: Request) {
  return handleChatPlatformWebhook(request, "slack");
}
