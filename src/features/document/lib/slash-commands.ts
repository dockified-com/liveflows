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
  {
    id: "paragraph",
    label: "Text",
    aliases: ["p", "paragraph", "plain"],
    group: "basic",
    action: "paragraph",
  },
  {
    id: "heading1",
    label: "Heading 1",
    aliases: ["h1", "title", "big"],
    group: "basic",
    action: "heading1",
  },
  {
    id: "heading2",
    label: "Heading 2",
    aliases: ["h2", "subtitle"],
    group: "basic",
    action: "heading2",
  },
  {
    id: "heading3",
    label: "Heading 3",
    aliases: ["h3"],
    group: "basic",
    action: "heading3",
  },
  {
    id: "bulletList",
    label: "Bulleted list",
    aliases: ["ul", "bullet", "unordered"],
    group: "basic",
    action: "bulletList",
  },
  {
    id: "orderedList",
    label: "Numbered list",
    aliases: ["ol", "numbered", "ordered"],
    group: "basic",
    action: "orderedList",
  },
  {
    id: "taskList",
    label: "To-do list",
    aliases: ["todo", "task", "checkbox", "checklist"],
    group: "basic",
    action: "taskList",
  },
  {
    id: "blockquote",
    label: "Quote",
    aliases: ["quote", "blockquote", "cite"],
    group: "basic",
    action: "blockquote",
  },
  {
    id: "divider",
    label: "Divider",
    aliases: ["hr", "rule", "separator", "line"],
    group: "layout",
    action: "divider",
  },
  {
    id: "callout",
    label: "Callout",
    aliases: ["callout", "note", "info", "warning", "admonition"],
    group: "layout",
    action: "callout",
  },
  {
    id: "table",
    label: "Table",
    aliases: ["table", "grid"],
    group: "layout",
    action: "table",
  },
  {
    id: "toc",
    label: "Table of contents",
    aliases: ["toc", "outline", "contents"],
    group: "layout",
    action: "toc",
  },
  {
    id: "codeBlock",
    label: "Code block",
    aliases: ["code", "snippet", "pre"],
    group: "technical",
    action: "codeBlock",
  },
  {
    id: "blockMath",
    label: "Equation",
    aliases: ["math", "latex", "katex", "formula", "equation"],
    group: "technical",
    action: "blockMath",
  },
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
    else if (command.aliases.some((a) => a.toLowerCase().startsWith(q)))
      score = 1;
    else if (label.includes(q)) score = 2;
    else if (command.aliases.some((a) => a.toLowerCase().includes(q)))
      score = 3;

    if (score >= 0) scored.push({ command, score });
  }

  return scored.sort((a, b) => a.score - b.score).map((entry) => entry.command);
}
