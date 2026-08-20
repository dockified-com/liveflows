# Agent Briefing — Document Editor Implementation

**Read this before starting any task file in this folder.** It carries the
conventions, invariants, and source-file context that apply to every task. You
implement one task; this is the shared ground truth.

---

## 1. What you are building

LiveFlows is a collaborative diagramming app. Documents live beside architecture
diagrams, and the document editor is currently 188 lines: `StarterKit` plus six
toolbar buttons (bold, italic, strike, H1, H2, bullet list).

You are turning it into a Notion-style editing surface: 13 block types, a full
formatting set, slash command menu, floating toolbar, block drag handles, tables
with row/column controls, syntax-highlighted code, math, links, emoji, an
in-document table of contents, and find.

Full spec: [`docs/specs/0006-document-editor.md`](../0006-document-editor.md).

## 2. Two invariants that fail silently

These are the ones that pass code review and break in production.

**`StarterKit`'s `history` must be disabled whenever a collaboration extension
is active.** y-prosemirror and Liveblocks each ship their own undo manager;
running StarterKit's alongside corrupts undo in ways that look like random
editor misbehavior. This is enforced by reading `PROVIDER_MANAGES_HISTORY` from
the provider module — never by hardcoding `history: false`, which the next
person deletes as dead config.

**`UniqueID` requires `filterTransaction: (tx) => !isChangeOrigin(tx)`.**
Without it, every remote sync regenerates every block ID. Nothing throws. Block
links silently rot, and later every MCP tool and comment anchor breaks. There is
a dedicated test for ID survival across split, merge, undo, and redo.

## 3. Build our own UI — this is deliberate

**Do not run `npx @tiptap/cli add`. Do not install any Tiptap UI Component.**

Adopting them was the original plan and was reversed after inspecting this
repository. Three costs are certain:

- They ship `.scss`; this repo has **zero `.scss` files and no `sass` dependency**.
- They carry a parallel `--tt-*` token vocabulary; `DESIGN.md` mandates
  `--ink` / `--accent` / `--line` and **forbids raw hex in JSX**.
- Each pulls its own primitives, hooks, and icon set, competing with
  `src/components/ui/` and `icon.tsx`.

And a fourth, unmeasured: their docs target React 18 / Next 15, while this repo
is React 19.2.8 / Next 16.3.0 with React Compiler on.

Decisively, **what adoption would save is already built here.** `@dnd-kit`
drives drag on five surfaces. `src/components/ui/` has `button`, `input`,
`modal-dialog`, `icon`, `status-pill`.

Reading their MIT source on GitHub as a *reference* is encouraged for the block
handle and copy-block-link. Copying it in is not.

Paying is also out: Tiptap Team plus Tracked Changes is ~$398/mo, the same
category of recurring cost that removed the previous realtime vendor from this
product.

## 4. Repo conventions

| Rule | Detail |
|---|---|
| Package manager | `pnpm` only. Never `npm` or `yarn`. |
| Lint / format | Biome: `pnpm lint`, `pnpm format`. Never ESLint or Prettier. |
| Test naming | `*.test.ts` / `*.test.tsx` → Vitest. `*.spec.ts` → Playwright. **Load-bearing**: a Playwright spec collected by Vitest fails in a way that looks like a broken test rather than a config error (`vitest.unit.config.ts:11-22`). |
| Vitest projects | `src/**/*.test.ts` runs on node; `src/**/*.test.tsx` runs on jsdom. Put editor tests in `.tsx`. |
| Styling | Tailwind v4 + CSS custom properties. **Raw hex in JSX is forbidden** by `DESIGN.md`. |
| Icons | `src/components/ui/icon.tsx`. Do not add an icon library. |
| Middleware | The file is `src/proxy.ts`, not `middleware.ts` — Next.js 16 renamed it. |
| Commits | One per task, at the end. Run `pnpm lint` first. |

Stack is locked: Next.js 16, React 19, Tailwind v4, Tiptap v3, Vitest 4. Do not
add a UI component library, a CSS-in-JS library, or an icon package.

## 5. Source files you must read

| File | Lines | Why |
|---|---|---|
| `src/features/document/document-editor.tsx` | 188 | What you are replacing. Note `useLiveblocksExtension()` at `:5`, its use at `:26`, and the offline banner at `:49-60`. |
| `DESIGN.md` | — | Token table. Required for any UI task. |
| `src/components/ui/button.tsx` | ~60 | `variant`: primary/secondary/ghost/destructive, `size`: sm/md/lg. Use `ghost` + `sm` for toolbar buttons. |
| `src/components/ui/icon.tsx` | ~60 | `<Icon size label>` wrapping raw SVG children, 24×24 viewBox, `currentColor`. |

If your task involves drag, also read `src/components/file-tree-dnd-context.tsx`
for the established `@dnd-kit` idiom (sensors, `DragOverlay`, `createPortal`).

## 6. Things about this repo that will surprise you

**`@tiptap/extension-color` and `@tiptap/extension-text-style` are already
installed but never wired in.** `text-style` is a required peer of `color`;
installing color alone silently does nothing.

**`CodeBlockLowlight` replaces StarterKit's `codeBlock`.** StarterKit must be
configured `codeBlock: false`. Registering both throws a duplicate-node-name
error at editor construction — loud, but baffling if you do not know the cause.

**`modal-dialog.tsx` has no focus trap.** It handles Escape, `aria-modal`, and
labelling, but there is no initial focus and no focus restore on close. Do not
treat it as an accessibility reference for menus. The usable references are
`file-tree.tsx:135` and `tab-bar.tsx:165`, which do roving tabindex via a ref map
plus `.focus()`.

**`DocumentSnapshot` exists in the schema with zero writes anywhere.** Document
content lives only in the collaboration provider. This batch does not change
that — persistence belongs to the realtime migration.

**Liveblocks is cancelled but still live.** Keep it wired. It stays behind the
provider seam so the migration swaps one module.

**`pnpm test` does not start the test Postgres** — `vitest.config.ts` declares no
`globalSetup`. Irrelevant here (nothing in this batch needs a database), but do
not be alarmed.

**AGENTS.md is stale on the data model.** Trust `prisma/schema.prisma`.

## 7. Accessibility is ours

A direct consequence of building our own UI, and the repo gives less of a head
start here than elsewhere. Every menu surface — slash menu, block menu, color
popover, emoji picker, table controls — needs, written from scratch:

- Initial focus on open
- Arrow-key navigation between items
- Escape to close, **returning focus to the trigger**
- Click-outside to dismiss
- `aria-expanded` and `aria-controls` on the trigger
- `role="menu"` / `role="menuitem"` where semantically correct

Every menu surface gets an a11y test beside its behavior test. Follow the idiom
in `src/components/__tests__/a11y.test.tsx` and `ui-primitives.test.tsx`
(`vitest-axe` is already a dependency).

## 8. Testing rules

**Assert on document JSON, not the DOM.** `editor.getJSON()` is the contract;
rendered markup is an implementation detail. A test asserting on `<strong>` will
break when styling changes and will not catch a broken schema.

**Pure logic gets pure tests.** `lib/outline.ts`, `lib/slash-commands.ts`, and
`lib/paste-rules.ts` have no React and no editor instance. Test them in
`.test.ts` (node), with no jsdom and no editor construction. These are the
fastest and most valuable tests in the batch.

**Editor tests need a real editor.** Use `@tiptap/react`'s `Editor` directly in
a `.test.tsx` file rather than mounting the whole React component, unless you are
specifically testing React behavior.

**TDD order, every task:** write the failing test → run it and confirm it fails
for the expected reason → write the minimal implementation → run and confirm it
passes → lint → commit. A test that passes before the implementation exists is
testing nothing.

## 9. When you finish

1. `pnpm lint` — must be clean.
2. Run your task's tests plus any existing suite for files you touched.
3. `pnpm build` if you changed `document-editor.tsx` or its imports.
4. Commit with the message in your task file.
5. Update [`progress.md`](./progress.md): status, date, commit SHA, and anything
   the next agent needs to know.

## 10. When to stop and ask

Report rather than improvising if:

- A task seems to require installing a Tiptap UI Component or a paid package.
- A test only passes if you weaken an assertion.
- You need to change a file your task's **Files** section does not list.
- Making your task work seems to require editing another task's line in
  `extensions/index.ts`.
- Making your task work seems to require restructuring `document-editor.tsx`
  after task 01 established its shell.
- An extension's package name or API differs from what your task file states.
  Tiptap v3 moved and split several packages; the spec's dependency list is
  explicitly marked as "confirm at install."

State what you found, what you tried, and what you think the right call is. Do
not silently expand scope and do not disable a failing test.
