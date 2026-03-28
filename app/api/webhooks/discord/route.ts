/**
 * Discord adapter pulls native optional deps (zlib-sync) that conflict with Turbopack.
 * Deploy a separate worker or use GitHub/Slack until we split the Chat instance.
 */
export async function POST() {
  return Response.json(
    {
      ok: false,
      error:
        "Discord adapter is not bundled in this deployment. Use GitHub or Slack webhooks, or run a sidecar with @chat-adapter/discord.",
    },
    { status: 501 },
  );
}
