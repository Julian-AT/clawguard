import { after } from "next/server";
import { isClawGuardAutomatedCommentBody } from "@/lib/github-automated-comment";
import { getGithubTokenUserId } from "@/lib/github-pat-user";
import { redis } from "@/lib/redis";

export const maxDuration = 300;

function commentBodyFromPayload(payload: Record<string, unknown>): string | undefined {
  const comment = payload.comment as Record<string, unknown> | undefined;
  return typeof comment?.body === "string" ? comment.body : undefined;
}

export async function POST(request: Request) {
  console.log("[webhook] POST received", request.headers.get("x-github-event"));

  const forSdk = request.clone();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch (e) {
    console.error("[webhook] Invalid JSON body:", e);
    return new Response("Bad Request", { status: 400 });
  }

  const githubEvent = request.headers.get("x-github-event") ?? "";

  const sender = body.sender as Record<string, unknown> | undefined;
  const comment = body.comment as Record<string, unknown> | undefined;
  const commentUser = comment?.user as Record<string, unknown> | undefined;
  if (sender?.type === "Bot" || commentUser?.type === "Bot") {
    console.log("[webhook] Ignoring bot comment from:", sender?.login);
    return new Response("OK", { status: 200 });
  }

  // PAT mode: the bot posts as the token owner. Those comments must not re-enter the
  // Chat SDK (cards and status lines include @GITHUB_BOT_USERNAME).
  if (
    process.env.GITHUB_TOKEN &&
    (githubEvent === "issue_comment" || githubEvent === "pull_request_review_comment")
  ) {
    const patUserId = await getGithubTokenUserId();
    const senderId = typeof sender?.id === "number" ? sender.id : Number(sender?.id);
    if (
      patUserId !== null &&
      senderId === patUserId &&
      isClawGuardAutomatedCommentBody(commentBodyFromPayload(body))
    ) {
      console.log("[webhook] Skipping PAT self-reply (automated ClawGuard comment)");
      return new Response("OK", { status: 200 });
    }
  }

  // @chat-adapter/github only calls processMessage for issue_comment when action is
  // "created" AND issue.pull_request is set (PR Conversation tab). Otherwise it
  // returns 200 with no bot work — same symptom as "bot ignored the mention".
  if (githubEvent === "issue_comment") {
    const action = body.action;
    const issue = body.issue as { pull_request?: unknown; number?: number } | undefined;
    if (action !== "created") {
      console.log(
        "[webhook] issue_comment action=%s — adapter only handles action=created (edits are ignored)",
        action,
      );
    } else if (issue && !issue.pull_request) {
      console.log(
        "[webhook] issue_comment on issue #%s is not a PR — comment on the pull request Conversation tab instead",
        issue.number,
      );
    } else if (issue?.pull_request) {
      console.log("[webhook] issue_comment on PR #%s — routing to Chat SDK", issue.number);
    }
  }

  const deliveryId = request.headers.get("x-github-delivery");
  if (deliveryId) {
    const key = `webhook:delivery:${deliveryId}`;
    const isNew = await redis.set(key, "1", { nx: true, ex: 3600 });
    if (!isNew) {
      console.log("[webhook] Duplicate delivery, skipping:", deliveryId);
      return new Response("OK", { status: 200 });
    }
  }

  if (githubEvent === "pull_request") {
    try {
      const { handlePullRequestEvent } = await import("@/lib/github-pull-request-webhook");
      return await handlePullRequestEvent(body, (task) => {
        after(() => {
          Promise.resolve(task).catch((err) =>
            console.error("[webhook] Background pull_request task error:", err),
          );
        });
      });
    } catch (err) {
      console.error("[webhook] pull_request handler failed:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  if (githubEvent === "issues") {
    try {
      const { handleIssuesEvent } = await import("@/lib/github-issues-webhook");
      return await handleIssuesEvent(body, (task) => {
        after(() => {
          Promise.resolve(task).catch((err) =>
            console.error("[webhook] Background issues task error:", err),
          );
        });
      });
    } catch (err) {
      console.error("[webhook] issues handler failed:", err);
      return new Response("Internal Server Error", { status: 500 });
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
            console.error("[webhook] Background task error:", err),
          );
        });
      },
    });
  } catch (err) {
    console.error("[webhook] Chat SDK or bot init failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
