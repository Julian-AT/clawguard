# hackingBuddyGPT integration notes

## What it is

[hackingBuddyGPT](https://github.com/ipa-lab/hackingBuddyGPT) is a research-oriented framework for LLM-driven security testing. It typically combines:

- **Use-case / scenario definitions** — discrete tasks (e.g. privilege escalation, credential discovery) composed into runs.
- **Tool permission model** — tools are registered with capabilities; the agent requests actions that the runtime allows or denies (similar in spirit to our `ToolRegistry` + `ToolPermission`).
- **CLI orchestration** — Python entrypoints drive runs, often with pluggable backends.

## Fit with ClawGuard

| Approach | Pros | Cons |
|----------|------|------|
| **Prompt-only (“hackingBuddy-style rounds”)** | No new runtime, works in Vercel Sandbox today | No shared code with the upstream project |
| **Python sidecar / subprocess** | Could reuse upstream tools verbatim | Violates single Next.js deployment constraint |
| **Protocol bridge (HTTP to external runner)** | Full parity with upstream | Extra infra, secrets, latency |

## Recommendation

Stay on **prompt-only + specialized `pentest` agent** inside the existing `AgentOrchestrator`, aligned with hackingBuddy’s *pattern* (multi-round, artifact-backed reasoning) rather than importing the Python package. If a future phase needs executable exploit modules, introduce an **optional** remote runner behind a feature flag rather than bundling Python in the Next.js app.

## Concrete next steps (optional)

1. Document pentest rounds and expected artifacts in [`lib/skills/definitions/pentest-methodology.ts`](../../lib/skills/definitions/pentest-methodology.ts).
2. Add config flag `scanning.pentestExternalRunnerUrl` only if a sidecar is introduced later.
3. Map our `ToolRegistry` permissions explicitly to pentest tool groups in docs (no code change required for parity).
