# Notion-Style Document Editor — Requirements

**Status**: Approved, not yet built
**Design**: [design.md](./design.md)
**Full spec**: [`docs/specs/0006-document-editor.md`](../../specs/0006-document-editor.md)

## The problem

The document editor works, but it barely does anything.

You can write paragraphs, make text bold or italic, strike it through, create two heading levels and a bullet list. That's the entire feature set — six buttons. There's no way to add a table, write a code snippet with syntax highlighting, drop in a formula, make a checklist, or call out a warning. For a tool meant to hold technical documentation next to architecture diagrams, that's not enough to write documentation in.

## What we are building

A document editor that behaves the way people already expect a modern one to behave.

**Type `/` and pick a block.** Heading, list, checklist, table, code block, quote, callout, divider, math. The menu filters as you type, so `/h1` finds Heading 1.

**Select text and a small toolbar appears** right where you're working — bold, italic, underline, strikethrough, inline code, link, highlight, text color. No reaching for a bar at the top of the screen.

**Hover any block and a handle appears beside it.** Click it for a menu: duplicate, delete, turn into something else, copy a link to that block. Or just drag it to move the block somewhere else.

**Write technical documentation properly.** Code blocks with real syntax highlighting for ten languages, a language picker, and copy-to-clipboard. Tables you can actually work with — add and remove rows and columns, resize, merge cells, drag rows into a different order. Math formulas, inline or as their own block.

**Markdown shortcuts work while you type.** `#` becomes a heading, `-` starts a list, `>` a quote, triple-backtick a code block.

**Paste from anywhere without cleaning up afterwards.** Websites, Google Docs, ChatGPT, GitHub. Useful formatting survives, junk doesn't.

**Insert a table of contents** as a block in the document. It lists your headings and jumps to them when clicked — useful for long documents, and it travels with the content.

**Find text** in a long document, with next and previous.

**Light and dark mode**, matching the rest of LiveFlows rather than looking like a bolted-on editor.

## What stays the way it is

Collaboration keeps working exactly as it does today. Several people can edit the same document at once and see each other's changes live, throughout this work and after it. Nobody loses that during the upgrade.

## What we are deliberately not building yet

Each of these is a real feature that needs its own planning:

- **Images.** A documentation editor without images is a genuine gap, and we know it. Images need file storage infrastructure that LiveFlows doesn't have yet, and picking a storage provider is a separate decision from building an editor.
- **@mentions.** Needs a way to look up who's in your workspace.
- **AI writing help** — improve, rewrite, shorten, explain. Needs the agent tooling built first. The menu reserves a slot for it so adding it later doesn't rearrange everything.
- **Comments.** Needs its own data model, separate from document content.
- **Suggested changes** you can accept or reject.
- **Links to diagrams and other documents.** Needs a way to address those resources.

## The cost we are accepting

**We're building on a paid product's free foundation, carefully.**

Tiptap — the editor engine — has a free open-source core and a paid tier. Everything in this release uses only the free parts. That's deliberate: LiveFlows is commercial and has to stay self-hostable without paying for editor infrastructure.

There's a real tradeoff in that. Tiptap sells a ready-made Notion-style template that would be faster to adopt, and it's paid. Some of its pieces — the AI assistant, the advanced color palettes, the right-click menu — are paid-only. Buying the plan that includes the template, plus the add-on that handles suggested changes, would run about $398 a month. That's the same kind of recurring bill we just removed by dropping our previous realtime vendor, so we're not adding it back for the editor.

Tiptap also publishes free UI pieces we could copy into our codebase. We looked, and we're not using them. They arrive with their own styling system, their own colour variables, and their own icons — none of which match the LiveFlows design system, so every piece would need rewriting anyway. More to the point, the work they'd save us is work already done: LiveFlows already has its own buttons, dialogs, icons, and a drag-and-drop system running in five places. We'd be importing someone else's answers to questions we've already answered.

So every part of the editor's interface is ours. That's slower up front, and it means the fiddly details — menus that close when they should, keyboard navigation, screen-reader labels — are our responsibility to get right. We think that's the better trade for something this central to the product.

## How we will know it works

- Every block type can be inserted and survives a save-and-reload
- `/` opens the menu, filtering finds blocks by name or shorthand
- Selecting text shows the toolbar; every formatting option applies and removes cleanly
- A block can be dragged to a new position and stays there
- A link to a block still works after the document has been edited elsewhere
- Code blocks highlight all ten languages
- A broken formula shows as broken — it does not blank the document
- Pasting from Google Docs produces no stray bold text
- The editor is usable on a phone, a tablet, and a desktop
- No paid dependency appears anywhere in the project
