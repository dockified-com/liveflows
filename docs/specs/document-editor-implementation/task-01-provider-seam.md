# Task 01 — Provider seam, extension assembly, UniqueID, editor shell

**Wave:** 1 (parallel with task-02)
**Depends on:** nothing
**ACs:** 1, 2, 3
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Establish the foundation every later task builds on: the single vendor-aware
module, the extension assembly that reads its history flag, stable block IDs, and
a slotted editor shell.

This task defines contracts that eleven other tasks consume. Get the shapes right.

## Files

- **Create:** `src/features/document/collaboration-provider.ts`
- **Create:** `src/features/document/extensions/index.ts`
- **Create:** `src/features/document/extensions/index.test.ts`
- **Create:** `src/features/document/extensions/unique-id.test.tsx`
- **Modify:** `src/features/document/document-editor.tsx`
- **Install:** `@tiptap/extension-unique-id`

## Interfaces

**Produces** — later tasks import these exact names:

```ts
// collaboration-provider.ts
export type ProviderStatus = "connecting" | "connected" | "disconnected" | "failed";
export function useCollaborationExtension(roomId: string): Extension;
export function useProviderStatus(): ProviderStatus;
export const PROVIDER_MANAGES_HISTORY: boolean;

// extensions/index.ts
export function buildExtensions(opts: { collaboration: Extension }): Extension[];

// document-editor.tsx
export interface DocumentEditorProps {
  roomId: string;
  readOnly?: boolean;
}
```

## Context

Read `src/features/document/document-editor.tsx` (188 lines) in full first. Note
`useLiveblocksExtension()` imported at `:5` and used at `:26`, and the offline
banner at `:49-60`.

Roughly 120 of those 188 lines are six toolbar buttons with duplicated Tailwind.
Task 03 replaces them with a config-driven toolbar, so **delete them here** and
leave a `toolbarSlot`. Do not try to preserve them.

Two invariants this task exists to enforce — see briefing §2:

- `history` must be off whenever a collaboration extension is active, driven by
  `PROVIDER_MANAGES_HISTORY` rather than a hardcoded `false`.
- `UniqueID` needs `filterTransaction: (tx) => !isChangeOrigin(tx)`.

`isChangeOrigin` comes from `@tiptap/extension-collaboration`. **If that package
is not already available**, do not install it — instead write the guard against
the Liveblocks-provided origin check, or if neither exists, use
`(tx) => !tx.getMeta("y-sync$")`. Report which you used in `progress.md`; this is
the one place where the correct import genuinely depends on what v3 exposes.

---

## Step 1: Install UniqueID

```bash
pnpm add @tiptap/extension-unique-id
```

If the package name 404s, stop and report — do not substitute a `@tiptap-pro/`
package (briefing §3).

## Step 2: Write the failing extension-assembly test

Create `src/features/document/extensions/index.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("../collaboration-provider", () => ({
  PROVIDER_MANAGES_HISTORY: true,
}));

const { buildExtensions } = await import("./index");

// A minimal stand-in; buildExtensions only passes it through.
const fakeCollab = { name: "fakeCollaboration" } as never;

describe("buildExtensions", () => {
  it("includes the collaboration extension it was given", () => {
    const names = buildExtensions({ collaboration: fakeCollab }).map(
      (e) => e.name,
    );
    expect(names).toContain("fakeCollaboration");
  });

  // AC-2. The whole reason this function exists.
  it("does not register history when the provider manages it", () => {
    const names = buildExtensions({ collaboration: fakeCollab }).map(
      (e) => e.name,
    );
    expect(names).not.toContain("history");
  });

  it("registers uniqueID", () => {
    const names = buildExtensions({ collaboration: fakeCollab }).map(
      (e) => e.name,
    );
    expect(names).toContain("uniqueID");
  });

  it("registers the core document nodes from StarterKit", () => {
    const names = buildExtensions({ collaboration: fakeCollab }).map(
      (e) => e.name,
    );
    for (const n of ["doc", "paragraph", "text", "heading", "bold", "italic"]) {
      expect(names, n).toContain(n);
    }
  });
});
```

## Step 3: Run it and confirm it fails

```bash
pnpm vitest run src/features/document/extensions/index.test.ts
```

Expected: cannot resolve `./index`.

## Step 4: Write the provider seam

Create `src/features/document/collaboration-provider.ts`:

```ts
"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import type { Extension } from "@tiptap/react";

/**
 * THE SEAM.
 *
 * This is the only module in the codebase that knows which collaboration vendor
 * is in use. The Hocuspocus/Yjs migration rewrites the bodies below and no other
 * file changes — see docs/features/realtime-collaboration/design.md.
 *
 * Do not import @liveblocks/* anywhere else under src/features/document/.
 */

const client = createClient({ authEndpoint: "/api/liveblocks-auth" });

const { RoomProvider, useStatus } = createRoomContext(client);

export { RoomProvider };

/** Normalized status. Deliberately NOT the vendor's own strings, so the
 *  autosave banner survives a provider swap untouched. */
export type ProviderStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

/**
 * True when the provider ships its own undo manager.
 *
 * Read by extensions/index.ts to decide whether to disable StarterKit's
 * history. Expressed as an exported value rather than a hardcoded false in the
 * extension list, so it stays correct when the provider changes — and so it
 * does not read as deletable dead config.
 */
export const PROVIDER_MANAGES_HISTORY = true;

export function useCollaborationExtension(_roomId: string): Extension {
  // Liveblocks resolves the room from the surrounding RoomProvider, so roomId
  // is unused here. Hocuspocus will need it — keep the parameter.
  return useLiveblocksExtension() as unknown as Extension;
}

export function useProviderStatus(): ProviderStatus {
  const status = useStatus();

  switch (status) {
    case "connected":
      return "connected";
    case "connecting":
    case "reconnecting":
      return "connecting";
    case "disconnected":
      return "disconnected";
    default:
      return "failed";
  }
}
```

> Note: `useStatus()`'s exact union comes from Liveblocks. If TypeScript rejects a
> case above, map what it actually returns onto the four `ProviderStatus` values
> rather than widening `ProviderStatus`.

## Step 5: Write the extension assembly

Create `src/features/document/extensions/index.ts`:

```ts
import UniqueID from "@tiptap/extension-unique-id";
import type { Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { PROVIDER_MANAGES_HISTORY } from "../collaboration-provider";

/**
 * Node types that carry a stable ID.
 *
 * Load-bearing for block links now, and for MCP tools, comment anchors, and
 * diagram references later. Every block-level type is included so no backfill
 * is ever needed.
 */
const ID_TYPES = [
  "heading",
  "paragraph",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "table",
  "callout",
  "blockMath",
];

/**
 * Assembles the editor's extension array.
 *
 * REGISTRATION SHAPE FOR LATER TASKS: append your module's exported array into
 * the spread list below, and add its import at the top. Do not reorder or edit
 * another task's line. Tasks 03, 04, 09, and 10 all extend this file.
 */
export function buildExtensions(opts: {
  collaboration: Extension;
}): Extension[] {
  return [
    StarterKit.configure({
      // The provider ships its own undo manager. Running StarterKit's alongside
      // corrupts undo. Never hardcode this — it must follow the provider.
      ...(PROVIDER_MANAGES_HISTORY ? { history: false } : {}),
      // Task 10 replaces this with CodeBlockLowlight. Registering both throws a
      // duplicate-node-name error at editor construction.
      codeBlock: false,
    }),

    UniqueID.configure({
      types: ID_TYPES,
      // Without this, every remote sync regenerates every ID. Nothing throws;
      // block links silently rot. See AGENT-BRIEFING.md §2.
      filterTransaction: (tx) => !isRemoteChange(tx),
    }),

    opts.collaboration,

    // task-03: ...formattingExtensions,
    // task-04: ...blockExtensions,
    // task-09: ...tableExtensions,
    // task-10: ...technicalContentExtensions,
  ] as Extension[];
}

/**
 * True when a transaction originated from a remote peer rather than local input.
 *
 * See task-01 step notes: the correct implementation depends on what Tiptap v3
 * exposes. Prefer isChangeOrigin from @tiptap/extension-collaboration if that
 * package is already present.
 */
function isRemoteChange(tx: { getMeta: (k: string) => unknown }): boolean {
  return Boolean(tx.getMeta("y-sync$"));
}
```

Since task 10 sets `codeBlock: false` here already, the code-block test in that
task will pass without editing this line. That is intentional — one fewer shared
edit.

## Step 6: Run the assembly test

```bash
pnpm vitest run src/features/document/extensions/index.test.ts
```

Expected: PASS, 4 tests.

## Step 7: Write the UniqueID survival test

This is the highest-value test in the task — it protects every downstream
consumer of block IDs.

Create `src/features/document/extensions/unique-id.test.tsx`:

```tsx
import UniqueID from "@tiptap/extension-unique-id";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

function makeEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      UniqueID.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "<p>first</p><p>second</p>",
  });
}

function ids(editor: Editor): (string | null)[] {
  return editor.getJSON().content?.map((n) => n.attrs?.id ?? null) ?? [];
}

describe("UniqueID", () => {
  it("assigns an id to every configured block", () => {
    const editor = makeEditor();
    const found = ids(editor);

    expect(found).toHaveLength(2);
    for (const id of found) {
      expect(id).toBeTruthy();
    }
    editor.destroy();
  });

  it("assigns distinct ids", () => {
    const editor = makeEditor();
    const [a, b] = ids(editor);

    expect(a).not.toBe(b);
    editor.destroy();
  });

  // AC-3: the properties that make block links durable.
  it("keeps the first block's id when a new block is split off", () => {
    const editor = makeEditor();
    const before = ids(editor)[0];

    editor.commands.setTextSelection(4); // inside "first"
    editor.commands.splitBlock();

    expect(ids(editor)[0]).toBe(before);
    editor.destroy();
  });

  it("keeps ids stable across undo and redo", () => {
    const editor = makeEditor();
    const before = ids(editor);

    editor.commands.setTextSelection(4);
    editor.commands.splitBlock();
    editor.commands.undo();

    expect(ids(editor)).toEqual(before);
    editor.destroy();
  });

  it("does not regenerate ids on unrelated updates", () => {
    const editor = makeEditor();
    const before = ids(editor);

    editor.commands.focus("end");
    editor.commands.insertContent(" more text");

    expect(ids(editor)).toEqual(before);
    editor.destroy();
  });
});
```

## Step 8: Run it

```bash
pnpm vitest run src/features/document/extensions/unique-id.test.tsx
```

Expected: PASS, 5 tests.

If the split test fails, the extension is regenerating IDs on structural change —
check the `types` array and that no `filterTransaction` is wrongly filtering
*local* transactions.

## Step 9: Restructure the editor into a slotted shell

Replace `src/features/document/document-editor.tsx` entirely:

```tsx
"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type React from "react";
import {
  RoomProvider,
  useCollaborationExtension,
  useProviderStatus,
} from "./collaboration-provider";
import { buildExtensions } from "./extensions";

export interface DocumentEditorProps {
  roomId: string;
  readOnly?: boolean;
  /** Filled by task-03. */
  toolbarSlot?: React.ReactNode;
  /** Filled by task-06. */
  bubbleSlot?: React.ReactNode;
  /** Filled by task-08. */
  blockHandleSlot?: React.ReactNode;
  /** Filled by task-11. */
  findSlot?: React.ReactNode;
}

function InnerDocumentEditor({
  roomId,
  readOnly = false,
  toolbarSlot,
  bubbleSlot,
  blockHandleSlot,
  findSlot,
}: DocumentEditorProps) {
  const collaboration = useCollaborationExtension(roomId);
  const status = useProviderStatus();

  const editor = useEditor({
    extensions: buildExtensions({ collaboration }),
    editable: !readOnly,
    immediatelyRender: false,
  });

  if (!editor) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--card)] p-6">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-2)]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--bg-2)]" />
        <span className="pt-2 text-xs text-[var(--ink-faint)]">
          Loading document editor…
        </span>
      </div>
    );
  }

  const isOffline = status === "disconnected" || status === "failed";

  return (
    <div className="flex h-full w-full flex-col bg-[var(--card)] font-sans">
      {isOffline ? (
        <div
          role="alert"
          aria-live="assertive"
          className="flex shrink-0 items-center gap-1.5 bg-[var(--destructive)] px-3 py-1 text-xs font-medium text-white"
        >
          <span className="h-2 w-2 animate-ping rounded-full bg-white" />
          <span>Offline — changes won&apos;t be saved</span>
        </div>
      ) : null}

      {!readOnly && toolbarSlot ? toolbarSlot : null}
      {findSlot}

      <div className="relative flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-[var(--ink)]">
        {blockHandleSlot}
        {bubbleSlot}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function DocumentEditor(props: DocumentEditorProps) {
  return (
    <RoomProvider id={props.roomId}>
      <InnerDocumentEditor {...props} />
    </RoomProvider>
  );
}
```

Colors use `DESIGN.md` tokens only — note the old file's `bg-red-600` is replaced
by `--destructive`, and `--surface*` tokens are replaced by the real token names
from `DESIGN.md`.

## Step 10: Check the existing consumer still builds

```bash
pnpm build
```

`src/features/project-workspace/editor-pane-router.tsx` renders `DocumentEditor`.
The props are backward compatible (`roomId`, `readOnly`), so it should compile
untouched.

```bash
pnpm vitest run src/features/project-workspace
```

If `editor-pane-router.test.tsx` fails because the editor internals changed,
update the test's mocks — do not revert the restructure.

## Step 11: Lint and commit

```bash
pnpm lint
git add package.json pnpm-lock.yaml src/features/document
git commit -m "feat(editor): add provider seam, extension assembly, and stable block IDs

The collaboration provider is now isolated in collaboration-provider.ts so the
Hocuspocus migration rewrites one module. StarterKit history is disabled via
PROVIDER_MANAGES_HISTORY rather than a hardcoded flag. UniqueID covers every
block-level type so no backfill is ever needed."
```

## Step 12: Update progress

Set task 01 to `done` in [`progress.md`](./progress.md) with the commit SHA, tick
AC-1/AC-2/AC-3, and **record which remote-change guard you used** (step 4 note) —
task 10 and the migration both need to know.

## Done when

- [ ] `index.test.ts` passes, 4 tests
- [ ] `unique-id.test.tsx` passes, 5 tests
- [ ] `pnpm build` succeeds
- [ ] `pnpm vitest run src/features/project-workspace` passes
- [ ] `pnpm lint` clean
- [ ] Committed, `progress.md` updated with the guard note

## Do not

- Import `@liveblocks/*` anywhere except `collaboration-provider.ts`
- Hardcode `history: false` instead of reading `PROVIDER_MANAGES_HISTORY`
- Drop `codeBlock: false` — task 10 depends on it
- Keep the six old toolbar buttons; task 03 replaces them
- Use raw hex colors (`DESIGN.md` forbids it)
- Install any `@tiptap-pro/*` package or run `npx @tiptap/cli add`
- Add formatting marks or block types — those are tasks 03 and 04
