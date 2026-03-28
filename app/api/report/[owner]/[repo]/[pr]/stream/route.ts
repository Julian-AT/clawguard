import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Params {
  owner: string;
  repo: string;
  pr: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
): Promise<Response> {
  const { owner, repo, pr } = await params;
  const channelKey = `stream:${owner}/${repo}/pr/${pr}`;

  const encoder = new TextEncoder();
  let closed = false;
  let cursor = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const poll = async () => {
        while (!closed) {
          try {
            const events = await redis.lrange(channelKey, cursor, cursor + 50);
            for (const raw of events) {
              try {
                const evt = JSON.parse(raw as string) as {
                  event: string;
                  payload: unknown;
                };
                send(evt.event, evt.payload);
              } catch {
                // skip malformed
              }
              cursor++;
            }

            const status = await redis.get(`${owner}/${repo}/pr/${pr}`);
            if (status) {
              try {
                const data = JSON.parse(status as string) as { status?: string };
                if (
                  data.status === "complete" ||
                  data.status === "error" ||
                  data.status === "partial_error"
                ) {
                  send("pipeline:complete", { status: data.status });
                  closed = true;
                  controller.close();
                  return;
                }
              } catch {
                // parse error, continue polling
              }
            }
          } catch {
            // Redis error, continue
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      };

      request.signal.addEventListener("abort", () => {
        closed = true;
      });

      setTimeout(() => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }, 10 * 60 * 1000);

      void poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
