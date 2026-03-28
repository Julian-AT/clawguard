export type ErrorSeverity = "fatal" | "degraded" | "warning";

export type ErrorCategory =
  | "pipeline"
  | "sandbox"
  | "fix"
  | "config"
  | "github"
  | "agent"
  | "tool"
  | "network"
  | "validation";

interface ClawGuardErrorOptions {
  context?: Record<string, unknown>;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  cause?: unknown;
  recoverable?: boolean;
}

export abstract class ClawGuardError extends Error {
  abstract readonly name: string;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly context: Record<string, unknown>;
  readonly recoverable: boolean;
  readonly timestamp: string;

  constructor(message: string, category: ErrorCategory, options: ClawGuardErrorOptions = {}) {
    super(message, { cause: options.cause });
    Object.setPrototypeOf(this, new.target.prototype);
    this.severity = options.severity ?? "fatal";
    this.category = options.category ?? category;
    this.context = options.context ?? {};
    this.recoverable = options.recoverable ?? false;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      severity: this.severity,
      category: this.category,
      context: this.context,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

export class PipelineError extends ClawGuardError {
  readonly name = "PipelineError";
  constructor(message: string, options?: ClawGuardErrorOptions) {
    super(message, "pipeline", options);
  }
}

export class SandboxError extends ClawGuardError {
  readonly name = "SandboxError";
  constructor(message: string, options?: ClawGuardErrorOptions) {
    super(message, "sandbox", options);
  }
}

export class FixError extends ClawGuardError {
  readonly name = "FixError";
  constructor(message: string, options?: ClawGuardErrorOptions) {
    super(message, "fix", options);
  }
}

export class ConfigError extends ClawGuardError {
  readonly name = "ConfigError";
  constructor(message: string, options?: ClawGuardErrorOptions) {
    super(message, "config", { severity: "degraded", recoverable: true, ...options });
  }
}

export class GitHubAPIError extends ClawGuardError {
  readonly name = "GitHubAPIError";
  constructor(message: string, options?: ClawGuardErrorOptions) {
    super(message, "github", options);
  }
}

export class AgentError extends ClawGuardError {
  readonly name = "AgentError";
  constructor(message: string, options?: ClawGuardErrorOptions) {
    super(message, "agent", options);
  }
}

export class ToolError extends ClawGuardError {
  readonly name = "ToolError";
  constructor(message: string, options?: ClawGuardErrorOptions) {
    super(message, "tool", { severity: "degraded", recoverable: true, ...options });
  }
}

export class ValidationError extends ClawGuardError {
  readonly name = "ValidationError";
  constructor(message: string, options?: ClawGuardErrorOptions) {
    super(message, "validation", { severity: "warning", recoverable: true, ...options });
  }
}

export function formatErrorForUser(error: unknown): string {
  if (error instanceof ClawGuardError) {
    const prefix = error.category !== "pipeline" ? `${capitalize(error.category)}: ` : "";
    return `${prefix}${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export function classifyError(error: unknown): {
  severity: ErrorSeverity;
  category: ErrorCategory;
  recoverable: boolean;
} {
  if (error instanceof ClawGuardError) {
    return {
      severity: error.severity,
      category: error.category,
      recoverable: error.recoverable,
    };
  }
  return { severity: "fatal", category: "pipeline", recoverable: false };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
