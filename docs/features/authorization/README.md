# Authorization and Permissions

Project roles (`owner` / `editor` / `viewer`) with folders and files inheriting
their project's permissions. One central authorization service, consumed
identically by the web app, the realtime layer, and MCP.

**Status**: Approved, not yet built

| Document | Read this if you want |
|---|---|
| [requirements.md](./requirements.md) | What changes for users, in plain language. No code. |
| [design.md](./design.md) | Schema, modules, invariants, build phases. For implementing it. |
| [Full spec](../../superpowers/specs/2026-08-19-authorization-design.md) | Acceptance criteria, options considered, and why each decision went the way it did. |

## The model in one screen

```
1. org:admin                 → owner        (floor, unconditional)
2. explicit ProjectMember    → that role    (override, incl. downgrade)
3. visibility = "workspace"  → editor       (default = today's behavior)
4. visibility = "private"    → no access    (invisible, 404)
```

Migration is additive and zero-backfill: `visibility` defaults to `"workspace"`
and the workspace default role is `editor`, so applying it changes nobody's
access.

## Two things to know before touching this

- **No member-management UI ships here.** Adding people to projects and setting
  visibility require direct database access until a follow-up. Private projects
  are enforced but not yet usable as a product feature.
- **`WorkspaceMember.role` becomes load-bearing for the first time.** It is
  written by the Clerk webhook today and read by nothing.

Related: [realtime-collaboration](../realtime-collaboration/README.md) consumes
the `authorizeRealtimeConnection` contract defined here.
