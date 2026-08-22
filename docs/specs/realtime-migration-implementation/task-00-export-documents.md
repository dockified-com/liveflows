# Task 00 — Export every document out of Liveblocks

**Wave:** 0 — **BLOCKING. Run before anything else in this batch.**
**Depends on:** nothing
**ACs:** 1, 2
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md), especially §2 and §3

## Why this exists

`DocumentSnapshot` has never been written to. Verify it yourself:

```bash
grep -rn "documentSnapshot" src/ --include="*.ts" --include="*.tsx" | grep -v generated
```

That returns nothing. Every Tiptap document in LiveFlows exists **only** inside
Liveblocks, because the `storageUpdated` webhook explicitly bails on non-canvas
files (`src/app/api/webhooks/liveblocks/route.ts:127-142`).

Liveblocks is being cancelled. If the account lapses before this export runs, every
document is permanently unrecoverable — no mirror, no backup, no recovery path.

Canvases are safe: `CanvasSnapshot` is populated.

**This task writes to disk, not to the database.** `DocumentSnapshot.yjsUpdate` does
not exist until task 02, so depending on it here would create a circular
dependency. Task 02 adds the column and imports these files.

## Files

- **Create:** `scripts/export-liveblocks-documents.ts`
- **Create:** `scripts/__tests__/export-liveblocks-documents.test.ts`
- **Writes to:** `.liveblocks-export/` (add to `.gitignore` — exported content must
  never be committed)

Do not modify any application code, any schema, or any existing test.

## Context

**Documents are Yjs, not Storage JSON.** `@liveblocks/react-tiptap` stores documents
as Yjs documents. `@liveblocks/node` exposes both:

```ts
getYjsDocumentAsBinaryUpdate(roomId: string, params?: { guid?: string }, options?): Promise<ArrayBuffer>
getYjsDocument(roomId: string, ...): Promise<JsonObject>
```

Fetch **both** per document:

| Output | Source | Purpose |
|---|---|---|
| `<fileId>.bin` | `getYjsDocumentAsBinaryUpdate` | Lossless. What task 02 imports and what seeding uses. |
| `<fileId>.json` | `getYjsDocument` | Readable. Human verification, and a fallback if a binary re-apply ever fails. |

The binary is authoritative. Reconstructing a `Y.Doc` from JSON is lossy — it
discards CRDT history and client-id structure — so never treat the JSON as the
recovery path.

**Which files to export.** Every `File` where `type = "document"`. Get the room id
from `File.liveblocksRoomId`, falling back to the `roomIdForFile` convention
(`file_<cuid>`) when the column is empty — `files.ts:246-248` documents that this
race exists.

**A never-opened document may legitimately have no Yjs document**, and Liveblocks
will return an error or an empty buffer. That is not a failure; record it as
`empty-by-design` in the manifest so AC-2 can distinguish it from a genuine miss.

**Idempotency (AC-1).** Re-running must be safe. Skip a file whose `.bin` already
exists unless `--force` is passed.

**Dry run first.** `--dry-run` enumerates and reports what would be exported,
writing nothing. This is how the run gets reviewed before it touches anything.

## Interfaces

```ts
// scripts/export-liveblocks-documents.ts
type ExportOutcome =
  | { fileId: string; roomId: string; status: "exported"; bytes: number }
  | { fileId: string; roomId: string; status: "skipped-exists" }
  | { fileId: string; roomId: string; status: "empty-by-design" }
  | { fileId: string; roomId: string; status: "failed"; error: string };

type Manifest = {
  startedAt: string;
  finishedAt: string;
  totalDocumentFiles: number;
  outcomes: ExportOutcome[];
};

// Exported for testing — pure, no I/O.
export function summarize(outcomes: ExportOutcome[]): {
  exported: number; skipped: number; empty: number; failed: number;
  complete: boolean;   // true when failed === 0
};
```

---

## Step 1: Gitignore the export directory

Before writing any code. Exported document content must never enter git.

Add to `.gitignore`:

```
# Liveblocks document export — contains real user content, never commit
.liveblocks-export/
```

## Step 2: Write the failing test for the pure part

Most of this script is I/O, but the summary logic decides whether the export is
considered complete, so it is worth testing directly.

Create `scripts/__tests__/export-liveblocks-documents.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarize } from "../export-liveblocks-documents";

describe("summarize", () => {
  it("reports an empty run as complete", () => {
    const s = summarize([]);
    expect(s).toEqual({
      exported: 0, skipped: 0, empty: 0, failed: 0, complete: true,
    });
  });

  it("counts each outcome type", () => {
    const s = summarize([
      { fileId: "a", roomId: "file_a", status: "exported", bytes: 10 },
      { fileId: "b", roomId: "file_b", status: "skipped-exists" },
      { fileId: "c", roomId: "file_c", status: "empty-by-design" },
      { fileId: "d", roomId: "file_d", status: "failed", error: "boom" },
    ]);

    expect(s.exported).toBe(1);
    expect(s.skipped).toBe(1);
    expect(s.empty).toBe(1);
    expect(s.failed).toBe(1);
  });

  // The property that matters: one failure means the export is NOT complete,
  // and the account must not be cancelled.
  it("is incomplete when anything failed", () => {
    expect(summarize([
      { fileId: "a", roomId: "file_a", status: "exported", bytes: 10 },
      { fileId: "d", roomId: "file_d", status: "failed", error: "boom" },
    ]).complete).toBe(false);
  });

  it("is complete when documents are empty by design", () => {
    expect(summarize([
      { fileId: "c", roomId: "file_c", status: "empty-by-design" },
    ]).complete).toBe(true);
  });

  it("is complete when everything was already exported", () => {
    expect(summarize([
      { fileId: "b", roomId: "file_b", status: "skipped-exists" },
    ]).complete).toBe(true);
  });
});
```

Run it, confirm it fails on the missing module.

## Step 3: Write the script

Create `scripts/export-liveblocks-documents.ts`.

Structure, in order:

1. **Parse flags**: `--dry-run`, `--force`, `--out=<dir>` (default
   `.liveblocks-export`).
2. **Guard**: require `LIVEBLOCKS_SECRET_KEY` and `DATABASE_URL`; exit non-zero with
   a clear message if either is missing.
3. **Enumerate** every `File` with `type: "document"`, selecting `id`, `name`,
   `liveblocksRoomId`, `projectId`. Use Prisma directly — this is a script, not
   application code, so the DAL's session requirement does not apply.
4. **Resolve the room id**: `file.liveblocksRoomId || \`file_${file.id}\``.
5. **Dry run**: print the resolved list with counts and exit 0 without writing.
6. **Per file**: skip if `<out>/<fileId>.bin` exists and `--force` was not passed.
   Otherwise fetch the binary update and the JSON. Treat an empty buffer or a
   404-shaped error as `empty-by-design`; treat anything else as `failed` and keep
   going — one bad document must not abort the run.
7. **Write** `<fileId>.bin` (Buffer from the ArrayBuffer) and `<fileId>.json`.
8. **Write** `<out>/manifest.json` with the full `Manifest`.
9. **Print a summary** and exit non-zero if `failed > 0`, so a partial export cannot
   be mistaken for success in CI or a shell chain.

Export `summarize` as a pure function so the test above passes.

Use `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` — Prisma 7
requires the driver adapter — and `new Liveblocks({ secret })` from
`@liveblocks/node`.

**Do not log token or secret values.** Log room ids and file names only.

## Step 4: Run the tests

```bash
pnpm vitest run scripts/__tests__/export-liveblocks-documents.test.ts
```

Expected: PASS, 5 tests.

## Step 5: Dry run against the real account

```bash
pnpm tsx scripts/export-liveblocks-documents.ts --dry-run
```

If `tsx` is not available, use `pnpm exec tsx` or add a `package.json` script.
Report which you used.

**Review the output before proceeding.** Confirm the document count matches your
expectation. Cross-check against the database:

```sql
SELECT count(*) FROM "File" WHERE type = 'document';
```

If the script's count and that query disagree, stop and report. A mismatch means the
enumeration is wrong, and an export that misses files is worse than no export
because it creates false confidence.

## Step 6: Run the real export

```bash
pnpm tsx scripts/export-liveblocks-documents.ts
```

Expect one `.bin` and one `.json` per document, plus `manifest.json`.

## Step 7: Verify a binary re-applies

The export is only meaningful if it restores. Prove it on one document:

```bash
pnpm add -D yjs   # if not already present
```

```ts
// throwaway check — do not commit
import * as Y from "yjs";
import { readFileSync } from "node:fs";

const doc = new Y.Doc();
Y.applyUpdate(doc, readFileSync(".liveblocks-export/<someFileId>.bin"));
console.log(JSON.stringify(doc.getXmlFragment("default").toJSON()).slice(0, 400));
```

You should see recognisable document structure. If `applyUpdate` throws or produces
an empty fragment for a document you know has content, **stop and report** — the
export format is wrong and cancelling the account would be unsafe.

Note the exact fragment key Tiptap uses (`default` is the common one, but
`@liveblocks/react-tiptap` may differ). Record it in `progress.md`: task 02's import
and task 06's seeding both need it.

## Step 8: Back up off the machine

Copy `.liveblocks-export/` somewhere outside this working tree — another disk, an
encrypted archive, wherever your team keeps backups.

This directory is gitignored, so it is not protected by version control. A laptop
failure between now and task 02 would put you back where you started.

## Step 9: Commit the script only

```bash
pnpm lint
git add .gitignore scripts/export-liveblocks-documents.ts scripts/__tests__/export-liveblocks-documents.test.ts
git commit -m "feat(migration): add Liveblocks document export script

DocumentSnapshot has never been written to, so every Tiptap document exists only
in Liveblocks. This exports each one as both a lossless Yjs binary update and
readable JSON, ahead of the Hocuspocus migration.

Writes to disk rather than the database because DocumentSnapshot.yjsUpdate does
not exist until task 02. Idempotent, with a dry-run mode and a manifest, and exits
non-zero on any failure so a partial export cannot look like success."
```

Verify the export content is **not** staged:

```bash
git status --short .liveblocks-export/    # must show nothing
```

## Step 10: Update progress

In [`progress.md`](./progress.md), tick every task-00 box in the blocking
prerequisite section, set task 00 `done`, tick AC-1 and AC-2, and record:

- The document count exported
- Any `empty-by-design` or `failed` entries
- **The Yjs fragment key you observed in step 7**
- Where the backup went

## Done when

- [ ] `.liveblocks-export/` is gitignored
- [ ] 5 tests pass
- [ ] Dry-run count matches the database
- [ ] Export ran with zero `failed` outcomes
- [ ] One binary verified to re-apply into a fresh `Y.Doc`
- [ ] Export directory backed up off the machine
- [ ] Script committed; exported content not committed
- [ ] `progress.md` updated including the fragment key

## Do not

- Write to `DocumentSnapshot` — that column does not exist yet (task 02)
- Commit anything under `.liveblocks-export/`
- Treat the JSON as the recovery path; the binary is authoritative
- Abort the whole run on one bad document; record and continue
- Exit zero when something failed
- Log secrets or tokens
- Touch the Liveblocks account settings, packages, or env vars
- Modify application code, the schema, or existing tests
