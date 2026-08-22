import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

/**
 * Bridges @dnd-kit (DOM elements and pointer coordinates) to ProseMirror
 * (document positions and nodes).
 *
 * This exists because the spec chose @dnd-kit — already driving drag on five
 * surfaces in this repo — over Tiptap's drag-handle extension, which knows about
 * positions but would pull four Yjs peers in early. See
 * docs/features/notion-docs-editor/design.md.
 */

export type BlockTarget = {
  pos: number;
  node: ProseMirrorNode;
  domEl: HTMLElement;
  depth: number;
};

/**
 * Maps viewport coordinates to the outermost block containing them.
 *
 * Always returns the depth-1 ancestor — a direct child of the document — so a
 * paragraph inside a table cell yields the table, not the paragraph. Dragging
 * inner content out of its parent would corrupt the structure.
 *
 * Returns null when the coordinates fall between blocks or outside the document.
 */
export function blockAtCoords(
  view: EditorView,
  coords: { x: number; y: number },
): BlockTarget | null {
  const hit = view.posAtCoords({ left: coords.x, top: coords.y });
  if (!hit) return null;

  const { doc } = view.state;
  if (hit.pos < 0 || hit.pos > doc.content.size) return null;

  let $pos: ReturnType<typeof doc.resolve>;
  try {
    $pos = doc.resolve(hit.pos);
  } catch {
    return null;
  }

  // Walk up to depth 1: a direct child of the doc.
  if ($pos.depth === 0) return null;
  const depth = 1;
  const node = $pos.node(depth);
  const pos = $pos.before(depth);

  const dom = view.nodeDOM(pos);
  const domEl =
    dom instanceof HTMLElement
      ? dom
      : (view.domAtPos(pos).node as HTMLElement | null);

  if (!domEl) return null;

  return { pos, node, domEl, depth };
}

/**
 * Reorders a top-level block via a single transaction.
 *
 * Never mutates the DOM — ProseMirror owns the document, and a DOM mutation
 * would desync the collaborative provider.
 *
 * Position arithmetic: after deleting the source, every position after it shifts
 * left by the node's size. Targets beyond the source are adjusted accordingly.
 */
export function moveBlock(
  view: EditorView,
  fromPos: number,
  toPos: number,
): boolean {
  const { state } = view;
  const { doc, tr } = state;

  if (fromPos < 0 || fromPos >= doc.content.size) return false;

  const node = doc.nodeAt(fromPos);
  if (!node) return false;

  const size = node.nodeSize;
  if (toPos === fromPos) return true;

  const clamped = Math.max(0, Math.min(toPos, doc.content.size));
  const insertAt = clamped > fromPos ? clamped - size : clamped;

  try {
    tr.delete(fromPos, fromPos + size);
    tr.insert(insertAt, node);
    view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}
