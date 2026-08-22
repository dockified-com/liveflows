import { Plugin } from "@tiptap/pm/state";
import { Extension } from "@tiptap/react";
import { stripGoogleDocsBold } from "../lib/paste-rules";

/**
 * ProseMirror already sanitizes by construction — pasted HTML is matched against
 * the schema and anything unmatched is dropped. The one real gap is Google Docs,
 * which wraps copied content in <b style="font-weight:normal">, so everything
 * pasted from Docs arrives bold.
 */
export const pasteHandler = Extension.create({
  name: "liveflowsPasteHandler",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPastedHTML: (html) => stripGoogleDocsBold(html),
        },
      }),
    ];
  },
});
