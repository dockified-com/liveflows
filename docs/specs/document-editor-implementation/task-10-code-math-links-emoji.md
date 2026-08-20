# Task 10 — Code blocks, math, links, emoji

**Wave:** 4 (parallel with task-08, task-09)
**Depends on:** task-04
**ACs:** 11, 12
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) and `DESIGN.md`

## Goal

The technical-documentation content types: syntax-highlighted code blocks with a
language selector and copy button, inline and block math, links, and emoji.

## Files

- **Create:** `src/features/document/extensions/technical-content.ts`
- **Create:** `src/features/document/extensions/code-block.test.tsx`
- **Create:** `src/features/document/extensions/math.test.tsx`
- **Create:** `src/features/document/extensions/link.test.tsx`
- **Create:** `src/features/document/ui/code-block-view.tsx`
- **Create:** `src/features/document/ui/code-block-view.test.tsx`
- **Create:** `src/features/document/ui/link-editor.tsx` + `.test.tsx`
- **Modify:** `src/features/document/extensions/index.ts` — **append one import and one spread entry only**

## Interfaces

**Produces:**

```ts
// extensions/technical-content.ts
export const technicalContentExtensions: Extension[];
export const CODE_LANGUAGES: readonly { id: string; label: string }[];
```

## Context

**Install** (all free namespace):

```bash
pnpm add @tiptap/extension-code-block-lowlight lowlight \
         @tiptap/extension-mathematics katex \
         @tiptap/extension-link @tiptap/extension-emoji
```

Confirm each package name resolves. Tiptap v3 moved several — report mismatches
in `progress.md` rather than substituting a `@tiptap-pro/` package (briefing §3).

**`codeBlock: false` is already set** in task 01's `StarterKit.configure`.
`CodeBlockLowlight` replaces StarterKit's `codeBlock`, and registering both throws
a duplicate-node-name error at editor construction. Task 01 pre-set the flag so
this task needs no shared edit — verify it is still there rather than adding it.

**Register only ten languages, individually.** `lowlight/all` pulls roughly 190
grammars, a substantial bundle cost for a documentation editor:

```
typescript · javascript · python · sql · json · bash · yaml · go · rust · java
```

Import each grammar from `highlight.js/lib/languages/<name>` and register with
`lowlight.register(name, grammar)`.

**Invalid LaTeX must never throw** (AC-12). A typo in a formula must not blank the
document. Configure the mathematics extension with a `katex` option of
`{ throwOnError: false }`, and verify the behavior with a test that feeds it
deliberately broken input. This is the error-handling requirement from the spec.

**KaTeX needs its stylesheet.** Import `katex/dist/katex.min.css` — in
`ui/code-block-view.tsx`'s sibling math view, or in `document-editor.tsx` if a
global import is cleaner. Note that this is the only third-party CSS the batch
introduces; it is unavoidable for formula rendering and does not conflict with
`DESIGN.md` since it only styles math internals.

**Link security.** Configure `Link` with:

```ts
Link.configure({
  openOnClick: false,        // clicking in the editor should not navigate
  autolink: true,
  protocols: ["http", "https", "mailto"],
  HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
})
```

`openOnClick: false` matters — navigating away mid-edit loses the user's place.
The `rel` attributes prevent tab-nabbing on rendered output. Restricting protocols
blocks `javascript:` URLs, which is the real XSS vector for a link extension.

**Task 06's link button becomes live automatically** once `setLink` exists. Check
that it enables, and note it in `progress.md`.

**Emoji is data plus a suggestion UI.** The extension supplies the emoji list and
the `:` input rule; the picker UI follows task 05's `Suggestion` pattern. Keep it
small — a filtered grid with keyboard navigation, per briefing §7.

---

## Step 1: Write the code-block test

Create `extensions/code-block.test.tsx`. Cover:

- The extension registers as `codeBlock` (name must match, since StarterKit's is
  disabled and the slash menu targets this name)
- `setCodeBlock()` creates a code block
- `setCodeBlock({ language: "typescript" })` sets the language attribute
- Language round-trips through document JSON
- A fenced markdown input rule (```` ```ts ````) creates a code block with that
  language
- Content inside a code block is not parsed as marks (typing `**x**` stays literal)
- An unknown language does not throw and falls back to no highlighting
- `CODE_LANGUAGES` contains exactly the ten required ids

## Step 2: Write the math test

Create `extensions/math.test.tsx`. Cover:

- `insertInlineMath({ latex: "x^2" })` inserts an inline math node
- `insertBlockMath({ latex: "E = mc^2" })` inserts a block math node
- LaTeX round-trips through document JSON
- Block math node is named `blockMath` (task 01's `ID_TYPES` expects it)
- **Invalid LaTeX does not throw** — feed `"\\frac{"` and assert the editor
  survives and the document is still valid
- `updateBlockMath` changes the latex attribute
- `deleteBlockMath` removes the node

The invalid-LaTeX test is the important one. Write it first.

## Step 3: Write the link test

Create `extensions/link.test.tsx`. Cover:

- `setLink({ href })` applies the mark
- `unsetLink()` removes it
- `href` round-trips through JSON
- A `javascript:` URL is rejected or stripped (protocol allowlist)
- Rendered attributes include `rel="noopener noreferrer nofollow"`
- Autolink converts a typed bare URL into a link
- `openOnClick` is false in the configuration

## Step 4: Implement the extensions

Create `extensions/technical-content.ts`:

```ts
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Emoji } from "@tiptap/extension-emoji";
import { Link } from "@tiptap/extension-link";
import { Mathematics } from "@tiptap/extension-mathematics";
import type { Extension } from "@tiptap/react";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
// ... nine more
import { CodeBlockView } from "../ui/code-block-view";

/** Ten languages, registered individually. lowlight/all is ~190 grammars. */
export const CODE_LANGUAGES = [
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
  { id: "json", label: "JSON" },
  { id: "bash", label: "Bash" },
  { id: "yaml", label: "YAML" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "java", label: "Java" },
] as const;

const lowlight = createLowlight();
lowlight.register("typescript", typescript);
// ... nine more

export const technicalContentExtensions: Extension[] = [
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockView);
    },
  }).configure({ lowlight, defaultLanguage: null }),

  // throwOnError: false is required — a formula typo must not blank the document.
  Mathematics.configure({ katexOptions: { throwOnError: false } }),

  Link.configure({
    openOnClick: false,
    autolink: true,
    protocols: ["http", "https", "mailto"],
    HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
  }),

  Emoji.configure({ enableEmoticons: true }),
] as unknown as Extension[];
```

Verify the actual option names against the installed packages — `katexOptions`
in particular may differ.

Then in `extensions/index.ts`, replace the `// task-10:` placeholder. **Task 09 is
editing this file in the same wave — append only, never reorder.**

## Step 5: Implement the code block view

Create `ui/code-block-view.tsx` using `NodeViewWrapper` and `NodeViewContent`.

- A header bar with a language `<select>` populated from `CODE_LANGUAGES`, plus a
  "Plain text" option for `null`
- A copy button that writes `node.textContent` to the clipboard and shows
  transient confirmation
- `<NodeViewContent as="pre">` for the code itself
- The select has an `aria-label="Code language"`; the copy button has
  `aria-label="Copy code"` and announces success via `aria-live`
- Styling from `DESIGN.md`: `--bg-2` background, `--line` border, `--ink` text,
  monospace family. **No raw hex** (AC-19)

Highlighting classes come from lowlight/highlight.js. Map the handful you care
about (`hljs-keyword`, `hljs-string`, `hljs-comment`, `hljs-number`,
`hljs-function`) to design tokens in `globals.css` rather than importing a
highlight.js theme, which would bring raw hex into the project.

## Step 6: Implement the link editor

Create `ui/link-editor.tsx` — a small inline form for entering and editing a URL,
opened from task 06's bubble toolbar link button.

- Text input with `type="url"`, labelled
- Apply and Remove buttons
- Enter applies, Escape cancels and returns focus to the trigger
- Pre-fills with the existing href when editing an existing link
- Rejects a URL whose protocol is outside the allowlist, with an inline message
  using `--destructive`

Test it: applies a link, removes one, pre-fills correctly, rejects
`javascript:alert(1)`, Escape restores focus, passes axe.

## Step 7: Verify

```bash
pnpm vitest run src/features/document
pnpm build
pnpm lint
```

By hand in `pnpm dev`: create a code block, switch languages and confirm
highlighting changes, copy the code; insert inline and block math; type a broken
formula and confirm the document survives; add and remove a link; type `:rocket:`
and confirm the emoji picker appears.

## Step 8: Commit

```bash
git add package.json pnpm-lock.yaml src/features/document src/app/globals.css
git commit -m "feat(editor): add code highlighting, math, links, and emoji

Ten lowlight grammars registered individually rather than importing all ~190.
Mathematics configured with throwOnError: false so an invalid formula never
blanks the document. Link restricts protocols to block javascript: URLs and sets
rel=noopener noreferrer nofollow."
```

Update [`progress.md`](./progress.md): task 10 `done`, tick AC-11 and AC-12,
confirm task 06's link button is now enabled, and record any package-name or
option-name differences you hit.

## Done when

- [ ] `code-block.test.tsx`, `math.test.tsx`, `link.test.tsx` all pass
- [ ] `code-block-view.test.tsx` and `link-editor.test.tsx` pass including axe
- [ ] The invalid-LaTeX test passes without the editor throwing
- [ ] `pnpm build` succeeds, `pnpm lint` clean
- [ ] Verified by hand
- [ ] Committed, `progress.md` updated

## Do not

- Import `lowlight/all` or `highlight.js` wholesale
- Import a highlight.js CSS theme; map classes to design tokens instead
- Let invalid LaTeX throw
- Set `openOnClick: true`
- Allow arbitrary URL protocols
- Add `codeBlock: false` to StarterKit — task 01 already did
- Edit tasks 03, 04, or 09's lines in `extensions/index.ts`
- Use raw hex colors outside the KaTeX stylesheet
