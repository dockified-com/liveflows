# Task 12 — Autosave status, responsive toolbar, theme and dependency audit

**Wave:** 5 (parallel with task-11)
**Depends on:** all previous tasks
**ACs:** 17, 18, 19, 20
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) and `DESIGN.md`

## Goal

Close the batch: surface save state to the user, make the editor usable on small
screens, and prove the two audit criteria the spec committed to — no paid
dependency, no raw hex.

This is the task that decides whether the feature is actually done.

## Files

- **Create:** `src/features/document/ui/save-status.tsx` + `.test.tsx`
- **Create:** `src/features/document/ui/use-toolbar-overflow.ts` + `.test.tsx`
- **Modify:** `src/features/document/ui/toolbar.tsx` — add overflow behavior
- **Modify:** `src/features/document/document-editor.tsx` — mount save status
- **Create:** `e2e/document-editor.spec.ts`

## Interfaces

**Consumes:**

```ts
import { useProviderStatus, type ProviderStatus } from "../collaboration-provider";  // task 01
```

**Produces:**

```ts
export function SaveStatus(props: { status: ProviderStatus; readOnly?: boolean }): JSX.Element;
export function useToolbarOverflow(ref: RefObject<HTMLElement>): { visibleCount: number };
```

## Context

**Save status reads the seam, not the vendor** (AC-17). `useProviderStatus()`
returns the normalized four-value union task 01 defined, so this component
survives the Hocuspocus migration untouched. If you find yourself importing
anything from `@liveblocks/*` here, that is the bug.

Four states, per the spec:

| `ProviderStatus` | Display | Token |
|---|---|---|
| `connecting` | "Saving…" | `--ink-faint` |
| `connected` | "Saved" | `--success` |
| `disconnected` / `failed` | "Connection lost" | `--destructive` |
| (`readOnly` prop) | "Read-only" | `--ink-soft` |

`readOnly` takes precedence over connection state — a viewer who cannot edit does
not need to know about save state.

Use `StatusPill` from `src/components/ui/status-pill.tsx` if its API fits; it
already exists for exactly this kind of indicator. Check before writing a new
component.

Announce changes with `aria-live="polite"`, not `assertive` — save state is
ambient, and assertive interrupts screen-reader users mid-sentence. Note the
offline **banner** from task 01 stays `assertive`; that one is urgent. Two
different urgencies, deliberately.

**Responsive toolbar** (AC-20). The toolbar has ~14 controls, which does not fit a
phone. Options considered: horizontal scroll, wrapping, or overflow menu. Use
**overflow**: measure available width, show what fits, collapse the rest behind a
"More" button. Horizontal scroll hides controls with no affordance; wrapping
pushes the content area down unpredictably.

`useToolbarOverflow` uses `ResizeObserver` on the container. jsdom does not
implement `ResizeObserver`, so the hook must tolerate its absence (return all
items visible) and the test must stub it. Guard rather than crash:

```ts
if (typeof ResizeObserver === "undefined") return { visibleCount: Infinity };
```

Breakpoints from `DESIGN.md` if it defines them; otherwise Tailwind defaults
(`sm` 640, `md` 768, `lg` 1024).

**The audits are the point of this task.** Both are single commands, and both must
pass before the feature is called done:

```bash
grep -c "@tiptap-pro" package.json          # AC-18: must print 0
```

For AC-19, scan for hex literals in the editor's JSX:

```bash
grep -rnE "#[0-9a-fA-F]{3,8}\b" src/features/document --include="*.tsx" --include="*.ts"
```

Expected result: **no matches in JSX styling**. Legitimate exceptions, which you
should confirm rather than assume:

- Hex passed as *data* to an editor command in a test (e.g. `toggleHighlight({ color: "#fef08a" })`)
- KaTeX's own stylesheet, which is third-party CSS and does not touch JSX

If a real violation exists in component styling, fix it by substituting the right
`DESIGN.md` token. Do not add a lint suppression.

**E2E covers what unit tests cannot.** Four flows, per the spec: slash menu
inserts a block, bubble toolbar formats a selection, drag reorders two blocks,
table add/remove row. Plus one viewport check for AC-20.

`playwright.config.ts` runs a full `pnpm run build && pnpm run start`, and
`e2e/global.setup.ts` handles Clerk auth via `clerkSetup()`. Follow the existing
`e2e/canvas-visual.spec.ts` for the harness idiom — do not invent a new auth path.

---

## Step 1: Build save status

Write `ui/save-status.test.tsx` first. Cover:

- `connecting` renders "Saving…"
- `connected` renders "Saved"
- `disconnected` renders "Connection lost"
- `failed` renders "Connection lost"
- `readOnly` renders "Read-only" **regardless of** connection status
- The container has `aria-live="polite"`
- Passes axe

Then implement `ui/save-status.tsx`, reusing `StatusPill` if suitable.

## Step 2: Mount it

In `document-editor.tsx`, render `<SaveStatus status={status} readOnly={readOnly} />`
in the toolbar row. `status` already comes from `useProviderStatus()` — task 01
wired it for the offline banner, so no new hook call is needed.

Do not restructure the shell.

## Step 3: Build toolbar overflow

Write `ui/use-toolbar-overflow.test.tsx` first, stubbing `ResizeObserver`:

```ts
beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
});
```

Cover: returns all items visible when `ResizeObserver` is undefined; returns a
reduced count for a narrow container; recomputes on resize; cleans up the observer
on unmount.

Then implement the hook and wire it into `ui/toolbar.tsx`: render the first
`visibleCount` buttons inline, the remainder in a "More" dropdown following
briefing §7 (arrow navigation, Escape returns focus, `aria-expanded`).

## Step 4: Run the audits

```bash
grep -c "@tiptap-pro" package.json
grep -rnE "#[0-9a-fA-F]{3,8}\b" src/features/document --include="*.tsx" --include="*.ts"
```

Record both results in `progress.md`. If the second returns styling violations,
fix them and re-run. Also confirm no `@liveblocks/*` import exists outside
`collaboration-provider.ts` (AC-1):

```bash
grep -rn "@liveblocks/" src/features/document | grep -v collaboration-provider
```

Expected: no output.

## Step 5: Write the E2E spec

Create `e2e/document-editor.spec.ts` covering:

1. Type `/` , pick "Heading 1", assert a heading exists
2. Select text, click Bold in the bubble, assert the mark applied
3. Drag one block above another, assert order changed
4. Insert a table, add a row, delete a row
5. At 375px width, assert the toolbar shows a "More" button and controls remain
   reachable

Use `data-testid` attributes where a role-based selector is ambiguous. Prefer
`getByRole` otherwise.

## Step 6: Full verification

Everything the spec promised:

```bash
pnpm lint
pnpm test -- --run
pnpm build
pnpm test:e2e
```

All four must pass.

## Step 7: Commit

```bash
git add src/features/document e2e
git commit -m "feat(editor): add save status, responsive toolbar, and close the audits

Save status reads the normalized provider seam rather than the vendor, so it
survives the Hocuspocus migration untouched. Toolbar collapses to an overflow menu
below the breakpoint rather than scrolling controls out of reach. Confirms no
@tiptap-pro dependency and no raw hex in editor JSX."
```

## Step 8: Close out progress

In [`progress.md`](./progress.md):

- Set task 12 `done`
- Tick AC-17, AC-18, AC-19, AC-20
- Fill in the **Final verification** table with all four command results
- Mark the feature `done`
- Append a log entry noting anything the realtime migration or the MCP spec needs
  to know — especially the remote-change guard task 01 recorded, and whether
  duplicated blocks get fresh IDs (task 08's note)

## Done when

- [ ] `save-status.test.tsx` passes including axe
- [ ] `use-toolbar-overflow.test.tsx` passes
- [ ] `grep -c "@tiptap-pro" package.json` prints 0
- [ ] No raw hex in editor JSX styling
- [ ] No `@liveblocks/*` import outside `collaboration-provider.ts`
- [ ] `pnpm lint`, `pnpm test -- --run`, `pnpm build`, `pnpm test:e2e` all pass
- [ ] Committed, `progress.md` fully closed out

## Do not

- Import `@liveblocks/*` in `save-status.tsx` — read the seam
- Use `aria-live="assertive"` for save state
- Solve the responsive toolbar with horizontal scroll alone
- Add a lint suppression to pass the hex audit
- Let `ResizeObserver` being undefined throw in tests
- Invent a new E2E auth path; follow `e2e/canvas-visual.spec.ts`
- Mark the feature done with any of the four commands failing
