import {
  ClawGuardError,
  classifyError,
  type ErrorSeverity,
  type ErrorCategory,
} from "./errors";
import { logAudit } from "./logger";

interface ErrorContext {
  runId?: string;
  agentName?: string;
  operation?: string;
  [key: string]: unknown;
}

interface HandledError {
  severity: ErrorSeverity;
  category: ErrorCategory;
  recoverable: boolean;
  message: string;
  logged: boolean;
}

export function handleError(error: unknown, ctx: ErrorContext = {}): HandledError {
  const classified = classifyError(error);
  const message =
    error instanceof Error ? error.message : String(error);

  const logCtx: Record<string, string | number | undefined> = {
    severity: classified.severity,
    category: classified.category,
    recoverable: classified.recoverable ? 1 : 0,
    operation: ctx.operation as string | undefined,
    agent: ctx.agentName as string | undefined,
  };

  if (error instanceof ClawGuardError && error.context) {
    for (const [k, v] of Object.entries(error.context)) {
      if (typeof v === "string" || typeof v === "number") {
        logCtx[k] = v;
      }
    }
  }

  logAudit(
    classified.severity === "warning" ? "bot" : "audit",
    `error:${classified.category}:${message.slice(0, 200)}`,
    logCtx
  );

  return {
    severity: classified.severity,
    category: classified.category,
    recoverable: classified.recoverable,
    message,
    logged: true,
  };
}
