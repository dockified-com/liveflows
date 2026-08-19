# Task 02 — Effective-role resolution

**Wave:** 2 (parallel with task-04)
**Depends on:** task-01 (`permissions.ts` must exist and be committed)
**Database:** not needed
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Implement the precedence chain that turns a caller plus a project into an
effective role. Pure function, no I/O. This is the single place where the
visibility default and the explicit member override are reconciled, which is
why it is isolated and exhaustively tested.

## Files

- **Create:** `src/server/authz/resolve.ts`
- **Create:** `src/server/authz/resolve.test.ts`

Do not modify `permissions.ts` or any other file.

## Interfaces

**Consumes** from `./permissions` (task-01):

```ts
import { isProjectRole, type ProjectRole } from "./permissions";
```

**Produces** — later tasks import these exact names:

```ts
type PrincipalRef = { userId: string; orgRole: string }
type ProjectAuthzShape = { visibility: string; members: readonly { role: string }[] }
resolveEffectiveRole(principal: PrincipalRef, project: ProjectAuthzShape): ProjectRole | null
const ORG_ADMIN_ROLE = "org:admin"
const WORKSPACE_DEFAULT_ROLE: ProjectRole = "editor"
const PROJECT_VISIBILITY_WORKSPACE = "workspace"
const PROJECT_VISIBILITY_PRIVATE = "private"
```

## Context

The precedence order, and it must be exactly this:

```
1. org:admin                 → owner        (floor, unconditional)
2. explicit ProjectMember    → that role    (override, including downgrade)
3. visibility = "workspace"  → editor       (default)
4. otherwise                 → null         (private, no row)
```

**The admin check is a FLOOR, not a fallback.** It runs first and cannot be
overridden by a lower explicit row. If you implement it as a fallback — only
consulted when no row exists — you introduce an unrecoverable state: downgrade
the last admin on a private project to `viewer` and nobody can restore access,
because a `viewer` holds neither `member.manage` nor `project.update`. There is
a test for this exact case.

**Two defensive behaviors are required.** An unrecognized stored role resolves
to `null`, never a silent grant. An unrecognized visibility is treated as
private (deny), not as workspace-visible. Both are tested.

The function takes a project *shape* rather than fetching anything. Callers do
the query. This is what keeps it pure and testable without a database.

---

## Step 1: Write the failing test

Create `src/server/authz/resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type ProjectAuthzShape, resolveEffectiveRole } from "./resolve";

const member = { userId: "user_1", orgRole: "org:member" };
const admin = { userId: "user_1", orgRole: "org:admin" };

function project(
  visibility: string,
  members: { role: string }[] = [],
): ProjectAuthzShape {
  return { visibility, members };
}

describe("resolveEffectiveRole — workspace-visible projects", () => {
  it("grants editor to an org member with no explicit row", () => {
    expect(resolveEffectiveRole(member, project("workspace"))).toBe("editor");
  });

  it("lets an explicit owner row upgrade a member", () => {
    expect(
      resolveEffectiveRole(member, project("workspace", [{ role: "owner" }])),
    ).toBe("owner");
  });

  it("lets an explicit viewer row downgrade a member", () => {
    expect(
      resolveEffectiveRole(member, project("workspace", [{ role: "viewer" }])),
    ).toBe("viewer");
  });

  it("keeps an explicit editor row as editor", () => {
    expect(
      resolveEffectiveRole(member, project("workspace", [{ role: "editor" }])),
    ).toBe("editor");
  });
});

describe("resolveEffectiveRole — private projects", () => {
  it("denies an org member with no explicit row", () => {
    expect(resolveEffectiveRole(member, project("private"))).toBeNull();
  });

  it("grants the explicit role when a row exists", () => {
    expect(
      resolveEffectiveRole(member, project("private", [{ role: "viewer" }])),
    ).toBe("viewer");
  });

  it("grants owner when an explicit owner row exists", () => {
    expect(
      resolveEffectiveRole(member, project("private", [{ role: "owner" }])),
    ).toBe("owner");
  });
});

describe("resolveEffectiveRole — org admin floor", () => {
  it("grants owner on a workspace-visible project", () => {
    expect(resolveEffectiveRole(admin, project("workspace"))).toBe("owner");
  });

  it("grants owner on a private project with no row", () => {
    expect(resolveEffectiveRole(admin, project("private"))).toBe("owner");
  });

  // THE FLOOR PROPERTY. An explicit lower row must NOT reduce an admin.
  // Without this, downgrading the last admin on a private project is
  // unrecoverable in-app: a viewer holds neither member.manage nor
  // project.update, so they cannot restore access or flip visibility back.
  it("grants owner even when an explicit viewer row exists", () => {
    expect(
      resolveEffectiveRole(admin, project("private", [{ role: "viewer" }])),
    ).toBe("owner");
  });

  it("grants owner even when an explicit editor row exists", () => {
    expect(
      resolveEffectiveRole(admin, project("workspace", [{ role: "editor" }])),
    ).toBe("owner");
  });
});

describe("resolveEffectiveRole — defensive cases", () => {
  it("treats an unrecognised stored role as no access", () => {
    expect(
      resolveEffectiveRole(
        member,
        project("workspace", [{ role: "org:some_future_role" }]),
      ),
    ).toBeNull();
  });

  it("treats an unrecognised visibility as private", () => {
    expect(resolveEffectiveRole(member, project("team"))).toBeNull();
  });

  it("treats an empty visibility as private", () => {
    expect(resolveEffectiveRole(member, project(""))).toBeNull();
  });

  it("treats an unrecognised org role as a plain member", () => {
    expect(
      resolveEffectiveRole(
        { userId: "user_1", orgRole: "org:billing_manager" },
        project("workspace"),
      ),
    ).toBe("editor");
  });

  it("ignores rows beyond the first (queries filter to one user)", () => {
    expect(
      resolveEffectiveRole(
        member,
        project("workspace", [{ role: "viewer" }, { role: "owner" }]),
      ),
    ).toBe("viewer");
  });
});
```

## Step 2: Run the test and confirm it fails

```bash
pnpm vitest run src/server/authz/resolve.test.ts
```

Expected: failure resolving `./resolve`.

## Step 3: Write the implementation

Create `src/server/authz/resolve.ts`:

```ts
import { isProjectRole, type ProjectRole } from "./permissions";

export const ORG_ADMIN_ROLE = "org:admin";

/** Role granted to any org member on a workspace-visible project. */
export const WORKSPACE_DEFAULT_ROLE: ProjectRole = "editor";

export const PROJECT_VISIBILITY_WORKSPACE = "workspace";
export const PROJECT_VISIBILITY_PRIVATE = "private";

/** The minimum a caller must carry for a role decision. */
export type PrincipalRef = {
  userId: string;
  orgRole: string;
};

/**
 * The minimum a project row must carry for a role decision.
 *
 * `members` is expected to be pre-filtered to the calling user — the service
 * queries with `where: { userId }` — so only the first entry is consulted.
 */
export type ProjectAuthzShape = {
  visibility: string;
  members: readonly { role: string }[];
};

/**
 * Resolves the caller's effective role on one project, or null for no access.
 *
 * Precedence, in order:
 *   1. org:admin              -> owner        (floor, unconditional)
 *   2. explicit member row    -> that role    (override, including downgrade)
 *   3. visibility=workspace   -> editor       (default)
 *   4. otherwise              -> null         (private, no row)
 *
 * The admin check is a FLOOR, not a fallback: it runs first and cannot be
 * overridden by a lower explicit row. Without that ordering, downgrading the
 * last admin on a private project is unrecoverable in-app, because a viewer
 * holds neither member.manage nor project.update.
 *
 * Pure — no I/O. Callers fetch the project shape themselves.
 */
export function resolveEffectiveRole(
  principal: PrincipalRef,
  project: ProjectAuthzShape,
): ProjectRole | null {
  if (principal.orgRole === ORG_ADMIN_ROLE) {
    return "owner";
  }

  const explicit = project.members[0]?.role;
  if (explicit !== undefined) {
    // Roles are opaque strings in the database. An unrecognised value is
    // treated as no access — never as a silent grant.
    return isProjectRole(explicit) ? explicit : null;
  }

  if (project.visibility === PROJECT_VISIBILITY_WORKSPACE) {
    return WORKSPACE_DEFAULT_ROLE;
  }

  return null;
}
```

## Step 4: Run the test and confirm it passes

```bash
pnpm vitest run src/server/authz/resolve.test.ts
```

Expected: PASS, 16 tests.

## Step 5: Confirm task-01 still passes

```bash
pnpm vitest run src/server/authz
```

Expected: PASS, 28 tests total (12 from task-01, 16 here).

## Step 6: Lint and commit

```bash
pnpm lint
git add src/server/authz/resolve.ts src/server/authz/resolve.test.ts
git commit -m "feat(authz): add effective role resolution with org admin floor"
```

## Step 7: Update progress

In [`progress.md`](./progress.md), set task 02 to `done` with the commit SHA and
date, tick AC-1, AC-2, and AC-3, and append a log entry.

## Done when

- [ ] `resolve.test.ts` passes with 16 tests
- [ ] `pnpm vitest run src/server/authz` passes with 28 tests
- [ ] `pnpm lint` clean
- [ ] Committed
- [ ] `progress.md` updated, AC-1/AC-2/AC-3 ticked

## Do not

- Reorder the precedence chain — the admin check must come first
- Make the admin check a fallback that only runs when no row exists
- Default an unknown visibility to workspace-visible (that would grant access on a typo)
- Add a database query, a Prisma import, or an `async` keyword — this function is pure and synchronous
