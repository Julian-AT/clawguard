# CodeRabbit-style capabilities vs local stack

## Product surface (high level)

CodeRabbit combines PR review with static analysis, often including AST-aware rules, dependency/context hints, and configurable review focus.

## What we can replicate locally

| Capability | ClawGuard approach |
|------------|-------------------|
| **Custom rules / policies** | `.clawguard/policies.yml` + agent prompts enforcing repository rules |
| **OWASP-oriented findings** | OWASP categories on `Finding`, skills in `lib/skills`, multi-agent coverage |
| **Diff-scoped review** | `git diff` + recon excerpts + `post-process` filtering to changed files |
| **Impact / blast-radius narrative** | Threat synthesis + dependency graph heuristics in `recon` |
| **Secret / dependency signals** | Dedicated agents + `npm audit` / pattern hints in recon |

## What is partial or heuristic today

| Capability | Gap | Possible improvement |
|------------|-----|----------------------|
| **Full AST analysis** | Recon uses regex/heuristics, not TS/JS parser | Add `@typescript-eslint/parser` or `tree-sitter` for TS/JS in sandbox (heavy) |
| **Whole-repo code graph** | Import graph is heuristic | Optional `madge` or `ts-morph` in sandbox for TS projects |
| **Precise dataflow** | LLM + snippets | Semgrep/SARIF already partially integrated; expand rules |
| **Learning from merges** | Predictions + issues webhook | Extend with explicit “false positive” labels → `recordFalsePositive` |

## Recommendation

Prioritize **Semgrep/SARIF + policy YAML + multi-agent findings** before adding a full AST service. If AST becomes necessary, add an **optional** sandbox step that outputs JSON for agents (no always-on parser in the hot path).
