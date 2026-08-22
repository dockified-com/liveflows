export type SlashCommandGroup = "basic" | "technical" | "layout";

export type SlashCommand = {
  id: string;
  label: string;
  action: string;
  group: SlashCommandGroup;
  description?: string;
  aliases?: string[];
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "text",
    label: "Text",
    action: "paragraph",
    group: "basic",
    aliases: ["p", "plain", "paragraph"],
  },
  {
    id: "h1",
    label: "Heading 1",
    action: "heading1",
    group: "basic",
    aliases: ["h1", "title", "header1"],
  },
  {
    id: "h2",
    label: "Heading 2",
    action: "heading2",
    group: "basic",
    aliases: ["h2", "subtitle", "header2"],
  },
  {
    id: "h3",
    label: "Heading 3",
    action: "heading3",
    group: "basic",
    aliases: ["h3", "subheading", "header3"],
  },
  {
    id: "bullet-list",
    label: "Bullet List",
    action: "bulletList",
    group: "basic",
    aliases: ["ul", "list", "bullet"],
  },
  {
    id: "ordered-list",
    label: "Numbered List",
    action: "orderedList",
    group: "basic",
    aliases: ["ol", "1.", "numbered"],
  },
  {
    id: "task-list",
    label: "Task List",
    action: "taskList",
    group: "basic",
    aliases: ["todo", "task", "check", "checkbox"],
  },
  {
    id: "quote",
    label: "Blockquote",
    action: "blockquote",
    group: "basic",
    aliases: ["quote", "callout"],
  },
  {
    id: "divider",
    label: "Divider",
    action: "divider",
    group: "basic",
    aliases: ["hr", "line", "separator"],
  },
  {
    id: "code-block",
    label: "Code Block",
    action: "codeBlock",
    group: "technical",
    aliases: ["code", "snippet", "pre"],
  },
  {
    id: "table",
    label: "Table",
    action: "table",
    group: "layout",
    aliases: ["grid", "sheet"],
  },
  {
    id: "details",
    label: "Collapsible",
    action: "details",
    group: "layout",
    aliases: ["accordion", "toggle", "collapse"],
  },
  {
    id: "callout-info",
    label: "Info Callout",
    action: "calloutInfo",
    group: "technical",
    aliases: ["info", "note", "alert"],
  },
  {
    id: "math",
    label: "Math Formula",
    action: "math",
    group: "technical",
    aliases: ["latex", "formula", "equation"],
  },
];

export function filterCommands(
  query: string,
  commands: readonly SlashCommand[] = SLASH_COMMANDS,
): SlashCommand[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [...commands];
  }

  const matches: { command: SlashCommand; score: number }[] = [];

  for (const command of commands) {
    const labelLower = command.label.toLowerCase();
    const actionLower = command.action.toLowerCase();
    const aliasesLower = (command.aliases ?? []).map((a) => a.toLowerCase());

    let score = -1;

    if (labelLower.startsWith(trimmed)) {
      score = 0;
    } else if (aliasesLower.some((a) => a === trimmed || a.startsWith(trimmed))) {
      score = 1;
    } else if (labelLower.includes(trimmed)) {
      score = 2;
    } else if (actionLower.includes(trimmed)) {
      score = 3;
    } else if (aliasesLower.some((a) => a.includes(trimmed))) {
      score = 4;
    }

    if (score !== -1) {
      matches.push({ command, score });
    }
  }

  matches.sort((a, b) => a.score - b.score);
  return matches.map((m) => m.command);
}
