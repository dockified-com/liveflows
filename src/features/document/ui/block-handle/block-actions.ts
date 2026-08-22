import {
  Fragment,
  type Node as ProseMirrorNode,
  type Schema,
} from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

export type TurnIntoTarget =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "callout";

function cloneWithoutIds(
  node: ProseMirrorNode,
  schema: Schema,
): ProseMirrorNode {
  if (node.isText) {
    return schema.text(node.text ?? "", node.marks);
  }
  const attrs = { ...node.attrs };
  if ("id" in attrs) {
    attrs.id = null;
  }
  const children: ProseMirrorNode[] = [];
  node.content.forEach((child) => {
    children.push(cloneWithoutIds(child, schema));
  });
  return node.type.create(
    attrs,
    children.length > 0 ? Fragment.fromArray(children) : undefined,
    node.marks,
  );
}

/**
 * Duplicates the block at `pos` and inserts the copy directly after it.
 * Preserves the node type and content, while assigning a new block ID.
 */
export function duplicateBlock(view: EditorView, pos: number): boolean {
  const { state } = view;
  const { doc, tr, schema } = state;

  if (pos < 0 || pos >= doc.content.size) return false;

  const node = doc.nodeAt(pos);
  if (!node) return false;

  const insertAt = pos + node.nodeSize;
  const cloned = cloneWithoutIds(node, schema);

  try {
    tr.insert(insertAt, cloned);
    view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes the block at `pos`.
 */
export function deleteBlock(view: EditorView, pos: number): boolean {
  const { state } = view;
  const { doc, tr } = state;

  if (pos < 0 || pos >= doc.content.size) return false;

  const node = doc.nodeAt(pos);
  if (!node) return false;

  try {
    tr.delete(pos, pos + node.nodeSize);
    view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns `#block-<id>` when the node has a non-empty `id` attribute, or null.
 */
export function blockLinkFor(node: ProseMirrorNode): string | null {
  const id = node.attrs?.id;
  if (typeof id === "string" && id.trim().length > 0) {
    return `#block-${id}`;
  }
  return null;
}

/**
 * Converts the block at `pos` to the target block type while preserving text content.
 */
export function turnInto(
  view: EditorView,
  pos: number,
  target: TurnIntoTarget,
): boolean {
  const { state } = view;
  const { doc, schema } = state;

  if (pos < 0 || pos >= doc.content.size) return false;

  const node = doc.nodeAt(pos);
  if (!node) return false;

  // Extract inline text/nodes or paragraphs from the block
  let textNodes: ProseMirrorNode[] = [];
  if (node.isTextblock) {
    textNodes = [node];
  } else {
    node.descendants((descendant) => {
      if (descendant.isTextblock) {
        textNodes.push(descendant);
        return false;
      }
      return true;
    });
  }

  // If no textblock found, fallback to creating an empty paragraph
  if (textNodes.length === 0 && schema.nodes.paragraph) {
    const emptyP = schema.nodes.paragraph.createAndFill();
    if (emptyP) {
      textNodes = [emptyP];
    }
  }

  const tr = state.tr;
  const from = pos;
  const to = pos + node.nodeSize;

  switch (target) {
    case "paragraph": {
      if (!schema.nodes.paragraph) return false;
      const newNodes = textNodes.map((tn) =>
        schema.nodes.paragraph.create(null, tn.content, tn.marks),
      );
      tr.replaceWith(from, to, Fragment.fromArray(newNodes));
      break;
    }
    case "heading1":
    case "heading2":
    case "heading3": {
      if (!schema.nodes.heading) return false;
      const level = target === "heading1" ? 1 : target === "heading2" ? 2 : 3;
      const newNodes = textNodes.map((tn) =>
        schema.nodes.heading.create({ level }, tn.content, tn.marks),
      );
      tr.replaceWith(from, to, Fragment.fromArray(newNodes));
      break;
    }
    case "bulletList": {
      if (
        !schema.nodes.bulletList ||
        !schema.nodes.listItem ||
        !schema.nodes.paragraph
      ) {
        return false;
      }
      const listItems = textNodes.map((tn) => {
        const p = schema.nodes.paragraph.create(null, tn.content, tn.marks);
        return schema.nodes.listItem.create(null, Fragment.from(p));
      });
      const list = schema.nodes.bulletList.create(
        null,
        Fragment.fromArray(listItems),
      );
      tr.replaceWith(from, to, list);
      break;
    }
    case "orderedList": {
      if (
        !schema.nodes.orderedList ||
        !schema.nodes.listItem ||
        !schema.nodes.paragraph
      ) {
        return false;
      }
      const listItems = textNodes.map((tn) => {
        const p = schema.nodes.paragraph.create(null, tn.content, tn.marks);
        return schema.nodes.listItem.create(null, Fragment.from(p));
      });
      const list = schema.nodes.orderedList.create(
        null,
        Fragment.fromArray(listItems),
      );
      tr.replaceWith(from, to, list);
      break;
    }
    case "blockquote": {
      if (!schema.nodes.blockquote || !schema.nodes.paragraph) return false;
      const paragraphs = textNodes.map((tn) =>
        schema.nodes.paragraph.create(null, tn.content, tn.marks),
      );
      const bq = schema.nodes.blockquote.create(
        null,
        Fragment.fromArray(paragraphs),
      );
      tr.replaceWith(from, to, bq);
      break;
    }
    case "callout": {
      if (!schema.nodes.callout || !schema.nodes.paragraph) return false;
      const paragraphs = textNodes.map((tn) =>
        schema.nodes.paragraph.create(null, tn.content, tn.marks),
      );
      const callout = schema.nodes.callout.create(
        { variant: "info", emoji: "💡" },
        Fragment.fromArray(paragraphs),
      );
      tr.replaceWith(from, to, callout);
      break;
    }
    default: {
      const _exhaustiveCheck: never = target;
      return false;
    }
  }

  try {
    view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes all marks (bold, italic, color, etc.) from the block at `pos`.
 */
export function resetFormatting(view: EditorView, pos: number): boolean {
  const { state } = view;
  const { doc } = state;

  if (pos < 0 || pos >= doc.content.size) return false;
  const node = doc.nodeAt(pos);
  if (!node) return false;

  const tr = state.tr;
  const from = pos;
  const to = pos + node.nodeSize;

  tr.removeMark(from, to);
  try {
    view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Applies text color or highlight background color to the block at `pos`.
 */
export function setBlockColor(
  view: EditorView,
  pos: number,
  color: string | null,
  isBackground = false,
): boolean {
  const { state } = view;
  const { doc, schema } = state;

  if (pos < 0 || pos >= doc.content.size) return false;
  const node = doc.nodeAt(pos);
  if (!node) return false;

  const tr = state.tr;
  const from = pos;
  const to = pos + node.nodeSize;

  const markType = isBackground
    ? schema.marks.highlight
    : schema.marks.textStyle;
  if (!markType) return false;

  if (!color) {
    tr.removeMark(from, to, markType);
  } else {
    const mark = markType.create({ color });
    tr.addMark(from, to, mark);
  }

  try {
    view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}
