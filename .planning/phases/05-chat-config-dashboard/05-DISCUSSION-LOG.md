# Phase 5: Chat, Config & Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 05-chat-config-dashboard
**Areas discussed:** Chat follow-up behavior, Dashboard pages & layout, Config reader & defaults, Auth & data scoping

---

## Chat Follow-Up Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| AI-generated contextual reply | Bot calls AI with audit findings as context + user's question, returns security-focused answer | ✓ |
| Static/scripted responses | Canned messages pointing to report link or listing available commands | |
| Redirect to report | Acknowledge question and suggest checking the report | |

**User's choice:** AI-generated contextual reply
**Notes:** Most impressive for demo, uses same AI Gateway + ToolLoopAgent pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Full audit context | Complete audit result + PR diff + conversation history from Redis | ✓ |
| Findings summary only | Only findings summary and scores, lighter on tokens | |
| Generic security expert | Just user's question with security expert system prompt | |

**User's choice:** Full audit context

| Option | Description | Selected |
|--------|-------------|----------|
| Redis-backed thread history | Store conversation messages in Redis per thread, multi-turn memory | ✓ |
| Stateless per message | Each question independent, no conversation memory | |

**User's choice:** Redis-backed thread history

| Option | Description | Selected |
|--------|-------------|----------|
| Post complete | Post complete answer once ready, simpler and reliable | ✓ |
| Stream via comment edits | Stream tokens into PR comment in real-time | |

**User's choice:** Post complete

---

## Dashboard Pages & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Repo card grid | Card grid with repo name, last audit, score badge, finding count | ✓ |
| Dense table list | Table rows with columns for repo, audit, score, findings | |
| Sidebar + detail panel | Left sidebar repo list, right panel shows selected repo | |

**User's choice:** Repo card grid

| Option | Description | Selected |
|--------|-------------|----------|
| Audit list table | Table with PR number/title, score, severity pills, date, report link | ✓ |
| Audit cards per PR | Individual cards per PR audit with score gauge | |

**User's choice:** Audit list table

| Option | Description | Selected |
|--------|-------------|----------|
| Onboarding message | "No repos audited yet" with setup guidance | ✓ |
| Placeholder cards | Empty grid with placeholder suggestion cards | |
| Redirect to setup | Redirect to getting started page | |

**User's choice:** Onboarding message

---

## Config Reader & Defaults

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch per audit via Octokit | Fetch from repo's default branch before each audit | ✓ |
| Redis-cached with invalidation | Cache in Redis, invalidate on push events | |
| Read from sandbox clone | Read from sandbox filesystem after clone | |

**User's choice:** Fetch per audit via Octokit

| Option | Description | Selected |
|--------|-------------|----------|
| Warn and use defaults | Log warning, use defaults, continue audit | ✓ |
| Fail with error message | Post error, skip audit | |
| Best-effort silent parsing | Parse what's valid, ignore rest silently | |

**User's choice:** Warn and use defaults

| Option | Description | Selected |
|--------|-------------|----------|
| Demo-friendly defaults | autoFix: true, severityThreshold: medium, aggressive | ✓ |
| Conservative defaults | autoFix: false, report only | |

**User's choice:** Demo-friendly defaults

---

## Auth & Data Scoping

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub OAuth via NextAuth | Standard GitHub OAuth via NextAuth 4 | |
| GitHub App installation auth | GitHub App installation-based auth | |

**User's choice:** GitHub OAuth via BetterAuth (Other — user specified BetterAuth instead of NextAuth)

| Option | Description | Selected |
|--------|-------------|----------|
| Public reports, private dashboard | Reports public, dashboard auth-gated | ✓ |
| All pages require auth | Everything requires login | |
| Private reports with share links | Private by default, share link generates public URL | |

**User's choice:** Public reports, private dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub repos → Redis scan | List user's GitHub repos, query Redis for matching keys | ✓ |
| User-indexed Redis mapping | Separate Redis index mapping users to repo audit keys | |
| Show all audits | Show all audits regardless of user access | |

**User's choice:** GitHub repos → Redis scan

---

## Claude's Discretion

- Chat response formatting and markdown structure
- BetterAuth configuration and middleware setup
- Redis conversation history schema and TTL
- Dashboard component composition and responsive breakpoints
- Config Zod schema exact field types
- Policy injection prompt engineering
- Redis key scanning strategy for dashboard
- Loading states and error handling

## Deferred Ideas

None — discussion stayed within phase scope
