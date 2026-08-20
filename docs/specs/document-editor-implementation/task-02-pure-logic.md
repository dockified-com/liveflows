# Task 02 — Pure logic modules

**Wave:** 1 (parallel with task-01)
**Depends on:** nothing
**ACs:** 6 (partial), 14, 15 (partial)
**Prerequisite:** read [`AGENT-BRIEFING.md`](./AGENT-BRIEFING.md) first

## Goal

Three modules with no React, no editor instance, and no DOM. These are the
fastest and most valuable tests in the batch, and tasks 05 and 11 consume their
contracts.

## Files

- **Create:** `src/features/document/lib/outline.ts` + `outline.test.ts`
- **Create:** `src/features/document/lib/slash-commands.ts` + `slash-commands.test.ts`
- **Create:** `src/features/document/lib/paste-rules.ts` + `paste-rules.test.ts`

Nothing else. This task does not touch the editor, `extensions/`, or `ui/`.

## Interfaces

**Produces** — tasks 05 and 11 import these exact names:

```ts
// lib/outline.ts
export type OutlineEntry = { id: string | null; level: 1 | 2 | 3; text: string };
export function extractOutline(doc: unknown): OutlineEntry[];

// lib/slash-commands.ts
export type SlashAction =
  | "paragraph" | "heading1" | "heading2" | "heading3"
  | "bulletList" | "orderedList" | "taskList"
  | "blockquote" | "codeBlock" | "divider"
  | "callout" | "table" | "blockMath" | "toc";
export type SlashCommand = {
  id: string;
  label: string;
  aliases: string[];
  group: "basic" | "technical" | "layout";
  action: SlashAction;
};
export const SLASH_COMMANDS: readonly SlashCommand[];
export function filterCommands(query: string, commands?: readonly SlashCommand[]): SlashCommand[];

// lib/paste-rules.ts
export function stripGoogleDocsBold(html: string): string;
```

## Context

**Why `action` instead of `run: (editor) => void`.** The spec sketched a `run`
callback, but Tiptap v3 augments its `Commands` interface per registered
extension — so `editor.chain().toggleCallout()` would fail typecheck until task
04 lands. An `action` discriminator keeps this module free of any editor
dependency, so wave 1 genuinely parallelizes. Task 05 owns the
`action → editor command` switch.

**`extractOutline` takes `unknown`, not a Tiptap type.** It reads a plain
ProseMirror JSON tree. Typing the parameter loosely and narrowing internally
keeps this module importable by anything, including later MCP tooling that reads
`DocumentSnapshot.content` straight from Postgres.

**Google Docs paste.** Google wraps copied content in
`<b style="font-weight:normal">`, which ProseMirror faithfully parses as bold.
That is the one paste gap worth closing; ProseMirror's schema matching already
drops scripts and unmatched tags, so no general sanitizer is needed.

---

## Step 1: Write the outline test

Create `src/features/document/lib/outline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractOutline } from "./outline";

function doc(...content: unknown[]) {
  return { type: "doc", content };
}

function heading(level: number, text: string, id: string | null = null) {
  return {
    type: "heading",
    attrs: { level, ...(id ? { id } : {}) },
    content: [{ type: "text", text }],
  };
}

function para(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

describe("extractOutline", () => {
  it("returns an empty array for an empty document", () => {
    expect(extractOutline(doc())).toEqual([]);
  });

  it("returns an empty array for a document with no headings", () => {
    expect(extractOutline(doc(para("hello")))).toEqual([]);
  });

  it("extracts headings in document order", () => {
    const result = extractOutline(
      doc(heading(1, "Architecture"), para("x"), heading(2, "Frontend")),
    );

    expect(result).toEqual([
      { id: null, level: 1, text: "Architecture" },
      { id: null, level: 2, text: "Frontend" },
    ]);
  });

  it("carries the stable block id when present", () => {
    const result = extractOutline(doc(heading(1, "A", "block_01")));
    expect(result[0].id).toBe("block_01");
  });

  it("ignores headings deeper than level 3", () => {
    const result = extractOutline(
      doc(heading(3, "keep"), heading(4, "drop"), heading(6, "drop")),
    );

    expect(result.map((e) => e.text)).toEqual(["keep"]);
  });

  it("handles skipped levels without inventing structure", () => {
    const result = extractOutline(doc(heading(1, "A"), heading(3, "C")));
    expect(result.map((e) => e.level)).toEqual([1, 3]);
  });

  it("concatenates multiple text nodes in one heading", () => {
    const result = extractOutline(
      doc({
        type: "heading",
        attrs: { level: 1 },
        content: [
          { type: "text", text: "Hello " },
          { type: "text", text: "world" },
        ],
      }),
    );

    expect(result[0].text).toBe("Hello world");
  });

  it("returns an empty string for a heading with no content", () => {
    const result = extractOutline(doc({ type: "heading", attrs: { level: 1 } }));
    expect(result[0].text).toBe("");
  });

  it("finds nested headings, e.g. inside a callout", () => {
    const result = extractOutline(
      doc({ type: "callout", content: [heading(2, "Inside")] }),
    );

    expect(result.map((e) => e.text)).toEqual(["Inside"]);
  });

  it("tolerates malformed input without throwing", () => {
    expect(extractOutline(null)).toEqual([]);
    expect(extractOutline(undefined)).toEqual([]);
    expect(extractOutline({})).toEqual([]);
    expect(extractOutline("nonsense")).toEqual([]);
  });
});
```

The malformed-input case matters: this function will eventually read JSON
straight from Postgres, where a corrupt `DocumentSnapshot` must not crash a route.

## Step 2: Run it, confirm failure

```bash
pnpm vitest run src/features/document/lib/outline.test.ts
```

## Step 3: Implement outline

Create `src/features/document/lib/outline.ts`:

```ts
/**
 * Extracts a heading tree from ProseMirror JSON.
 *
 * Pure — no React, no editor instance, no DOM. Takes `unknown` so it can also
 * read a DocumentSnapshot.content blob straight from Postgres, where the shape
 * is not guaranteed.
 */

export type OutlineEntry = {
  id: string | null;
  level: 1 | 2 | 3;
  text: string;
};

type JsonNode = {
  type?: unknown;
  attrs?: Record<string, unknown>;
  content?: unknown;
  text?: unknown;
};

function isNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null;
}

/** Concatenates every descendant text node. */
function textOf(node: JsonNode): string {
  if (typeof node.text === "string") return node.text;
  if (!Array.isArray(node.content)) return "";

  return node.content
    .map((child) => (isNode(child) ? textOf(child) : ""))
    .join("");
}

export function extractOutline(doc: unknown): OutlineEntry[] {
  const out: OutlineEntry[] = [];

  function walk(node: unknown): void {
    if (!isNode(node)) return;

    if (node.type === "heading") {
      const level = node.attrs?.level;
      if (level === 1 || level === 2 || level === 3) {
        const id = node.attrs?.id;
        out.push({
          id: typeof id === "string" ? id : null,
          level,
          text: textOf(node),
        });
      }
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
    }
  }

  walk(doc);
  return out;
}
```

## Step 4: Write the slash-command test

Create `src/features/document/lib/slash-commands.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterCommands, SLASH_COMMANDS } from "./slash-commands";

describe("SLASH_COMMANDS", () => {
  it("covers every insertable block type", () => {
    expect(SLASH_COMMANDS.length).toBeGreaterThanOrEqual(14);
  });

  it("has unique ids", () => {
    const ids = SLASH_COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique actions", () => {
    const actions = SLASH_COMMANDS.map((c) => c.action);
    expect(new Set(actions).size).toBe(actions.length);
  });

  it("assigns every command to a known group", () => {
    for (const c of SLASH_COMMANDS) {
      expect(["basic", "technical", "layout"]).toContain(c.group);
    }
  });
});

describe("filterCommands", () => {
  it("returns everything for an empty query", () => {
    expect(filterCommands("")).toHaveLength(SLASH_COMMANDS.length);
  });

  it("matches on label, case-insensitively", () => {
    const labels = filterCommands("head").map((c) => c.label);
    expect(labels).toContain("Heading 1");

    expect(filterCommands("HEAD").map((c) => c.label)).toEqual(labels);
  });

  it("matches on alias", () => {
    expect(filterCommands("h1").map((c) => c.action)).toContain("heading1");
  });

  it("matches a shorthand alias for a multiword label", () => {
    expect(filterCommands("todo").map((c) => c.action)).toContain("taskList");
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterCommands("zzzzz")).toEqual([]);
  });

  it("ignores surrounding whitespace", () => {
    expect(filterCommands("  h1  ").map((c) => c.action)).toContain("heading1");
  });

  it("ranks a label prefix match above a mid-string match", () => {
    const result = filterCommands("code");
    expect(result[0].action).toBe("codeBlock");
  });

  it("accepts an explicit command list", () => {
    const only = [SLASH_COMMANDS[0]];
    expect(filterCommands("", only)).toEqual(only);
  });
});
```

## Step 5: Run it, confirm failure, then implement

Create `src/features/document/lib/slash-commands.ts`:

```ts
/**
 * The slash-menu command registry.
 *
 * Plain data — no editor import, not even a type-only one. Tiptap v3 augments
 * its Commands interface per registered extension, so holding editor callbacks
 * here would couple this module to the block extensions. Task 05 owns the
 * action -> editor command mapping instead.
 */

export type SlashAction =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "divider"
  | "callout"
  | "table"
  | "blockMath"
  | "toc";

export type SlashCommand = {
  id: string;
  label: string;
  aliases: string[];
  group: "basic" | "technical" | "layout";
  action: SlashAction;
};

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  { id: "paragraph", label: "Text", aliases: ["p", "paragraph", "plain"], group: "basic", action: "paragraph" },
  { id: "heading1", label: "Heading 1", aliases: ["h1", "title", "big"], group: "basic", action: "heading1" },
  { id: "heading2", label: "Heading 2", aliases: ["h2", "subtitle"], group: "basic", action: "heading2" },
  { id: "heading3", label: "Heading 3", aliases: ["h3"], group: "basic", action: "heading3" },
  { id: "bulletList", label: "Bulleted list", aliases: ["ul", "bullet", "unordered"], group: "basic", action: "bulletList" },
  { id: "orderedList", label: "Numbered list", aliases: ["ol", "numbered", "ordered"], group: "basic", action: "orderedList" },
  { id: "taskList", label: "To-do list", aliases: ["todo", "task", "checkbox", "checklist"], group: "basic", action: "taskList" },
  { id: "blockquote", label: "Quote", aliases: ["quote", "blockquote", "cite"], group: "basic", action: "blockquote" },
  { id: "divider", label: "Divider", aliases: ["hr", "rule", "separator", "line"], group: "layout", action: "divider" },
  { id: "callout", label: "Callout", aliases: ["callout", "note", "info", "warning", "admonition"], group: "layout", action: "callout" },
  { id: "table", label: "Table", aliases: ["table", "grid"], group: "layout", action: "table" },
  { id: "toc", label: "Table of contents", aliases: ["toc", "outline", "contents"], group: "layout", action: "toc" },
  { id: "codeBlock", label: "Code block", aliases: ["code", "snippet", "pre"], group: "technical", action: "codeBlock" },
  { id: "blockMath", label: "Equation", aliases: ["math", "latex", "katex", "formula", "equation"], group: "technical", action: "blockMath" },
];

/**
 * Filters by label or alias, ranking label-prefix matches first so the obvious
 * candidate lands at the top of the menu.
 */
export function filterCommands(
  query: string,
  commands: readonly SlashCommand[] = SLASH_COMMANDS,
): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...commands];

  const scored: { command: SlashCommand; score: number }[] = [];

  for (const command of commands) {
    const label = command.label.toLowerCase();

    let score = -1;
    if (label.startsWith(q)) score = 0;
    else if (command.aliases.some((a) => a.toLowerCase().startsWith(q))) score = 1;
    else if (label.includes(q)) score = 2;
    else if (command.aliases.some((a) => a.toLowerCase().includes(q))) score = 3;

    if (score >= 0) scored.push({ command, score });
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.command);
}
```

## Step 6: Write the paste-rules test

Create `src/features/document/lib/paste-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { stripGoogleDocsBold } from "./paste-rules";

describe("stripGoogleDocsBold", () => {
  it("unwraps a normal-weight bold tag", () => {
    const input = '<b style="font-weight:normal" id="docs-internal-guid-x"><p>hi</p></b>';
    const result = stripGoogleDocsBold(input);

    expect(result).not.toContain("<b");
    expect(result).toContain("<p>hi</p>");
  });

  it("tolerates spacing variations in the style attribute", () => {
    const input = '<b style="font-weight: normal;"><p>hi</p></b>';
    expect(stripGoogleDocsBold(input)).not.toContain("<b");
  });

  it("tolerates single quotes", () => {
    const input = "<b style='font-weight:normal'><p>hi</p></b>";
    expect(stripGoogleDocsBold(input)).not.toContain("<b");
  });

  it("leaves genuine bold alone", () => {
    const input = "<p>a <b>real bold</b> word</p>";
    expect(stripGoogleDocsBold(input)).toBe(input);
  });

  it("leaves bold with an explicit weight alone", () => {
    const input = '<p><b style="font-weight:700">heavy</b></p>';
    expect(stripGoogleDocsBold(input)).toBe(input);
  });

  it("handles multiple wrappers", () => {
    const input =
      '<b style="font-weight:normal"><p>one</p></b><b style="font-weight:normal"><p>two</p></b>';
    const result = stripGoogleDocsBold(input);

    expect(result).not.toContain("<b");
    expect(result).toContain("one");
    expect(result).toContain("two");
  });

  it("returns non-matching input unchanged", () => {
    expect(stripGoogleDocsBold("<p>plain</p>")).toBe("<p>plain</p>");
    expect(stripGoogleDocsBold("")).toBe("");
  });
});
```

## Step 7: Implement paste rules

Create `src/features/document/lib/paste-rules.ts`:

```ts
/**
 * Paste normalization.
 *
 * ProseMirror already sanitizes by construction: pasted HTML is parsed against
 * the schema and anything unmatched is dropped, so scripts and unknown tags
 * cannot survive. No general sanitizer is needed.
 *
 * The one real gap is Google Docs, which wraps copied content in
 * <b style="font-weight:normal"> as a styling artifact. ProseMirror faithfully
 * reads that as bold, so everything pasted from Docs arrives bold.
 */

const GOOGLE_DOCS_BOLD =
  /<b(?=[^>]*\sstyle\s*=\s*["'][^"']*font-weight\s*:\s*normal)[^>]*>([\s\S]*?)<\/b>/gi;

/** Unwraps Google Docs' normal-weight <b> wrapper, preserving its children. */
export function stripGoogleDocsBold(html: string): string {
  return html.replace(GOOGLE_DOCS_BOLD, "$1");
}
```

## Step 8: Run all three suites

```bash
pnpm vitest run src/features/document/lib
```

Expected: PASS — 10 outline + 12 slash + 7 paste = 29 tests.

These are `.test.ts`, so they run on node with no jsdom and no editor. They
should complete in well under a second.

## Step 9: Lint and commit

```bash
pnpm lint
git add src/features/document/lib
git commit -m "feat(editor): add pure outline, slash-command, and paste-rule modules

No React, no editor instance, no DOM. extractOutline takes unknown so it can
also read a DocumentSnapshot blob from Postgres. The slash registry holds an
action discriminator rather than editor callbacks, keeping it decoupled from
the block extensions."
```

## Step 10: Update progress

Set task 02 to `done` in [`progress.md`](./progress.md) with the commit SHA and
tick AC-14.

## Done when

- [ ] `pnpm vitest run src/features/document/lib` passes, 29 tests
- [ ] `pnpm lint` clean
- [ ] Committed, `progress.md` updated

## Do not

- Import anything from `@tiptap/*` in these three modules, including type-only imports
- Import React
- Add a `run`/`execute` callback to `SlashCommand` — task 05 owns the action mapping
- Add a general HTML sanitizer; ProseMirror's schema matching already does that
- Use `DOMParser` in `paste-rules.ts` — it must run in the node test environment
- Put these tests in `.test.tsx`; they must stay on the node project
