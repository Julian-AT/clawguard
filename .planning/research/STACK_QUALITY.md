# Stack quality additions (proposed)

These are optional follow-ups; the core stack is documented in `CLAUDE.md` / `research/STACK.md`.

| Area | Addition | Why |
|------|-----------|-----|
| Static analysis | Semgrep rules in-repo (already partially via SARIF) | Repeatable rules beyond LLM |
| TS/JS AST | `typescript` compiler API or `ts-morph` in sandbox | Precise references / imports |
| Supply chain | OSV or `npm audit` JSON (already in recon) | CVE coverage |
| Testing | Contract tests for `ToolRegistry` + orchestrator layers | Regression safety |
| Observability | OpenTelemetry on pipeline + tool spans | Production debugging |

No new npm dependencies were added in this pass unless already present (`micromatch` was already a dependency).
