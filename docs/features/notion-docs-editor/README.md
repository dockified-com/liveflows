# Notion-Style Document Editor

A Notion-style editing surface for technical documentation: 13 block types, slash
command menu, floating toolbar, block drag handles, tables with row/column
controls, syntax-highlighted code, and math. Built entirely on free,
open-source Tiptap foundations.

**Status**: Approved, not yet built

| Document | Read this if you want |
|---|---|
| [requirements.md](./requirements.md) | What changes for users, in plain language. No code. |
| [design.md](./design.md) | Module structure, extensions, licensing, phases. For implementing it. |
| [Full spec](../../specs/0006-document-editor.md) | 20 acceptance criteria, options considered, and why each decision went the way it did. |

## Where we start from

`src/features/document/document-editor.tsx` is 188 lines: `StarterKit` plus six
toolbar buttons (bold, italic, strike, H1, H2, bullet list). Roughly 120 of
those lines are duplicated toolbar JSX. Two installed Tiptap packages —
`extension-color` and `extension-text-style` — are never wired in.

## The architecture in one screen

Everything turns on one idea: **the collaboration provider is a single module,
and nothing else imports it.**

```ts
// collaboration-provider.ts — the only vendor-aware file
useCollaborationExtension(roomId): Extension
useProviderStatus(): ProviderStatus
PROVIDER_MANAGES_HISTORY: boolean
```

Today it wraps Liveblocks. The Hocuspocus migration rewrites this file's body
and **no other file changes**.

## Three things to know before touching this

- **No paid Tiptap dependencies**, verified not assumed. `extension-unique-id`
  and `extension-mathematics` are in the free namespace. Comments, Content AI,
  and DOCX conversion are paid and excluded — which maps exactly onto the
  features this spec defers anyway. Paying for Tiptap Team plus Tracked Changes
  would be ~$398/mo, the same category of recurring cost that removed the
  previous realtime vendor.
- **The linked Notion-like template is paid.** Its own page says so, and names
  the AI assistant, advanced color palettes, and context menus as paid-only. It
  is a **UX reference**, not something we adopt.
- **Every UI surface is ours.** No Tiptap UI Component is installed. Adoption was
  the initial plan and was reversed: their components ship `.scss` into a repo
  with no Sass toolchain, carry a parallel `--tt-*` token vocabulary, and bring
  competing primitives and icons — while the things adoption would save are
  already built here (`@dnd-kit` drives drag on five surfaces, and
  `src/components/ui/` has the primitives with an a11y suite).

## Two invariants that fail silently

- **`StarterKit`'s `history` must be disabled** whenever a collaboration
  extension is active. y-prosemirror and Liveblocks each bring their own undo
  manager; running StarterKit's alongside corrupts undo. Enforced via
  `PROVIDER_MANAGES_HISTORY` rather than a comment.
- **`UniqueID` needs `filterTransaction: (tx) => !isChangeOrigin(tx)`.** Without
  it, every remote sync regenerates every block ID — silently breaking block
  links now, and every MCP tool and comment anchor later.

## Not in this feature

Images (needs object storage), mentions (needs a user directory), AI inline
editing, suggestions, comments, internal LiveFlows references, and — critically
— collaboration persistence.

`DocumentSnapshot` stays empty. Filling it belongs to
[realtime-collaboration](../realtime-collaboration/README.md), where
`onStoreDocument` is the natural hook. A debounced client save here would be
scaffolding the migration deletes, and a second writer racing the provider.
