import UniqueID from "@tiptap/extension-unique-id";
import type { Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { PROVIDER_MANAGES_HISTORY } from "../collaboration-provider";

/**
 * Node types that carry a stable ID.
 *
 * Load-bearing for block links now, and for MCP tools, comment anchors, and
 * diagram references later. Every block-level type is included so no backfill
 * is ever needed.
 */
const ID_TYPES = [
  "heading",
  "paragraph",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "table",
  "callout",
  "blockMath",
];

function flattenExtensions(extensions: Extension[]): Extension[] {
  const result: Extension[] = [];
  for (const ext of extensions) {
    if (!ext) continue;
    const addExts = (ext as { config?: { addExtensions?: () => Extension[] } })
      .config?.addExtensions;
    if (typeof addExts === "function") {
      result.push(...flattenExtensions(addExts.call(ext)));
    } else {
      result.push(ext);
    }
  }
  return result;
}

/**
 * Assembles the editor's extension array.
 *
 * REGISTRATION SHAPE FOR LATER TASKS: append your module's exported array into
 * the spread list below, and add its import at the top. Do not reorder or edit
 * another task's line. Tasks 03, 04, 09, and 10 all extend this file.
 */
export function buildExtensions(opts: {
  collaboration: Extension;
}): Extension[] {
  return flattenExtensions([
    StarterKit.configure({
      // The provider ships its own undo manager. Running StarterKit's alongside
      // corrupts undo. Never hardcode this — it must follow the provider.
      ...(PROVIDER_MANAGES_HISTORY
        ? { undoRedo: false, history: false as never }
        : {}),
      // Task 10 replaces this with CodeBlockLowlight. Registering both throws a
      // duplicate-node-name error at editor construction.
      codeBlock: false,
    }),

    UniqueID.configure({
      types: ID_TYPES,
      // Without this, every remote sync regenerates every ID. Nothing throws;
      // block links silently rot. See AGENT-BRIEFING.md §2.
      filterTransaction: (tx) => !isRemoteChange(tx),
    }),

    opts.collaboration,

    // task-03: ...formattingExtensions,
    // task-04: ...blockExtensions,
    // task-09: ...tableExtensions,
    // task-10: ...technicalContentExtensions,
  ]);
}

/**
 * True when a transaction originated from a remote peer rather than local input.
 *
 * See task-01 step notes: the correct implementation depends on what Tiptap v3
 * exposes. Prefer isChangeOrigin from @tiptap/extension-collaboration if that
 * package is already present.
 */
function isRemoteChange(tx: { getMeta: (k: string) => unknown }): boolean {
  return Boolean(tx.getMeta("y-sync$"));
}
