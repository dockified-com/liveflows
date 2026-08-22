import { mergeAttributes, Node, ReactNodeViewRenderer } from "@tiptap/react";
import { TocView } from "../ui/toc-view";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    toc: {
      insertToc: () => ReturnType;
      insertTableOfContents: () => ReturnType;
    };
  }
}

export const Toc = Node.create({
  name: "toc",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toc"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "toc",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TocView);
  },

  addCommands() {
    return {
      insertToc:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name });
        },
      insertTableOfContents:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name });
        },
    };
  },
});
