/**
 * Structured errors for pipeline, sandbox, fixes, config, and GitHub API.
 */

export class PipelineError extends Error {
  readonly name = "PipelineError";
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SandboxError extends Error {
  readonly name = "SandboxError";
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class FixError extends Error {
  readonly name = "FixError";
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigError extends Error {
  readonly name = "ConfigError";
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GitHubAPIError extends Error {
  readonly name = "GitHubAPIError";
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function formatErrorForUser(error: unknown): string {
  if (error instanceof PipelineError) return error.message;
  if (error instanceof SandboxError) return `Sandbox: ${error.message}`;
  if (error instanceof FixError) return `Fix: ${error.message}`;
  if (error instanceof ConfigError) return `Config: ${error.message}`;
  if (error instanceof GitHubAPIError) return `GitHub: ${error.message}`;
  if (error instanceof Error) return error.message;
  return String(error);
}
