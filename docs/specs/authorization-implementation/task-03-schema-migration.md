# Task 03 — Schema migration

**Wave:** 1 (parallel with task-01, task-05)
**Depends on:** nothing
**Database:** yes — migrates your local dev database
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Add `ProjectMember` and `Project.visibility` to the schema. The migration must
be **purely additive and zero-backfill** — applying it must change no existing
user's effective access.

## Files

- **Modify:** `prisma/schema.prisma`
- **Generated:** `prisma/migrations/<timestamp>_project_members_and_visibility/migration.sql`
- **Generated:** `src/generated/prisma/**` (Prisma client output, checked into git)

Do not modify any `src/server/**` file.

## Interfaces

**Consumes:** nothing.

**Produces** — tasks 04, 06, 07, 08, 09 depend on these existing:

- Prisma model `ProjectMember` with composite primary key `[projectId, userId]`
- `db.projectMember` on the Prisma client
- `Project.visibility: string`, defaulting to `"workspace"`
- `Project.members` relation
- `Project.createdBy` relation to `User`

## Context

`visibility` defaults to `"workspace"`, and (per task-02) a workspace-visible
project grants `editor` to every org member. That combination is what makes
this zero-backfill: the instant the migration lands, every existing user has
exactly the access they had before.

`@@index([userId])` on `ProjectMember` is **required, not optional**. Phase 3's
discovery query filters on `userId` and would otherwise scan the table.

`Project.createdById` is currently a bare `String` with no foreign key and no
index. Adding the relation can fail if any row points at a missing `User` —
Step 5 covers that.

---

## Step 1: Read the current schema

```bash
cat prisma/schema.prisma
```

Note the line numbers for `User` (about 10-19) and `Project` (about 44-56).
Confirm there are zero `enum` declarations — roles are stored as strings.

## Step 2: Add the `ProjectMember` model

Append to `prisma/schema.prisma`:

```prisma
model ProjectMember {
  projectId String
  userId    String
  role      String   // "owner" | "editor" | "viewer" — opaque string, never an enum
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([projectId, userId])
  @@index([userId])
}
```

## Step 3: Add `visibility` and relations to `Project`

Replace the entire `Project` model with:

```prisma
model Project {
  id          String    @id @default(cuid())
  name        String
  workspaceId String
  createdById String
  visibility  String    @default("workspace") // "workspace" | "private"
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy   User      @relation("ProjectCreator", fields: [createdById], references: [id])
  members     ProjectMember[]
  folders     Folder[]
  files       File[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([workspaceId, updatedAt])
}
```

The only additions are `visibility`, `createdBy`, and `members`. Everything
else is unchanged — do not drop `@@index([workspaceId, updatedAt])`.

## Step 4: Add the back-relations to `User`

The `User` model needs two new fields. Add them after the existing `tokens`
line:

```prisma
  projectMemberships ProjectMember[]
  createdProjects    Project[]       @relation("ProjectCreator")
```

Then validate:

```bash
pnpm exec prisma validate
```

Expected: "The schema at prisma/schema.prisma is valid". If it reports a
missing opposite relation, you skipped this step.

## Step 5: Check for orphaned `createdById` values

`Project.createdById` has never had a foreign key, so it may contain ids with
no matching `User`. Adding the relation will fail if so. Check first:

```bash
psql "$DIRECT_URL" -c 'SELECT p.id, p."createdById" FROM "Project" p LEFT JOIN "User" u ON u.id = p."createdById" WHERE u.id IS NULL;'
```

- **Zero rows** — proceed to Step 6.
- **Any rows** — **stop and report.** Do not delete projects and do not remove
  the `createdBy` relation to force the migration through; task-08 depends on
  it. The fix is to create the missing `User` rows (they exist in Clerk) or, if
  the ids are genuinely junk, to have a human decide. Report the row count and
  the offending ids.

## Step 6: Create and apply the migration

```bash
pnpm exec prisma migrate dev --name project_members_and_visibility
```

Expected: a new directory under `prisma/migrations/`, applied cleanly, and the
client regenerated into `src/generated/prisma`.

## Step 7: Verify the generated SQL is additive

```bash
cat prisma/migrations/*project_members_and_visibility/migration.sql
```

The file must contain **only** `CREATE TABLE`, `ALTER TABLE ... ADD COLUMN`,
`CREATE INDEX`, `CREATE UNIQUE INDEX`, and `ADD CONSTRAINT`.

If you see any `DROP`, `UPDATE`, or `DELETE`, **stop and report** — something
in Steps 3-4 diverged from the current schema. This check is AC-13.

## Step 8: Verify the default applies to existing rows

```bash
psql "$DIRECT_URL" -c 'SELECT visibility, count(*) FROM "Project" GROUP BY visibility;'
```

Expected: a single row, `workspace`, count equal to your total project count.
Any other value means the default did not apply.

## Step 9: Commit

```bash
pnpm lint
git add prisma/schema.prisma prisma/migrations src/generated/prisma
git commit -m "feat(authz): add ProjectMember and Project.visibility

Additive and zero-backfill: visibility defaults to workspace and the
workspace default role is editor, so no existing user's access changes."
```

The generated client under `src/generated/prisma` is checked into git in this
repo — include it.

## Step 10: Update progress

In [`progress.md`](./progress.md), set task 03 to `done` with the commit SHA and
date, tick AC-13, and append a log entry noting the orphan check result.

## Done when

- [ ] `pnpm exec prisma validate` passes
- [ ] Orphan check returned zero rows (or was escalated)
- [ ] Migration applied
- [ ] Generated SQL contains no `DROP` / `UPDATE` / `DELETE`
- [ ] Every existing project reports `visibility = workspace`
- [ ] Committed including `src/generated/prisma`
- [ ] `progress.md` updated, AC-13 ticked

## Do not

- Use a Prisma `enum` for `role` or `visibility` — this schema has zero enums deliberately
- Make `visibility` nullable or default it to `private` (that would revoke everyone's access)
- Backfill `ProjectMember` rows — the override model does not need them
- Add `onDelete: Cascade` to `createdBy`; deleting a user should not delete their projects
- Run `prisma db push` against the dev database instead of a real migration
