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
