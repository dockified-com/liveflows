import {
  mergeAttributes,
  Node,
  ReactNodeViewRenderer,
  wrappingInputRule,
} from "@tiptap/react";
import { CalloutView } from "../ui/callout-view";

export type CalloutVariant = "info" | "warning" | "success" | "danger";

export const DEFAULT_CALLOUT_EMOJI: Record<CalloutVariant, string> = {
  info: "💡",
  warning: "⚠️",
  success: "✅",
  danger: "🚨",
};

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: {
        variant?: CalloutVariant;
        emoji?: string;
      }) => ReturnType;
      toggleCallout: (attrs?: {
        variant?: CalloutVariant;
        emoji?: string;
      }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-variant") || "info",
        renderHTML: (attributes) => ({
          "data-variant": attributes.variant,
        }),
      },
      emoji: {
        default: "💡",
        parseHTML: (element) =>
          element.getAttribute("data-emoji") ||
          DEFAULT_CALLOUT_EMOJI[
            (element.getAttribute("data-variant") as CalloutVariant) || "info"
          ] ||
          "💡",
        renderHTML: (attributes) => ({
          "data-emoji": attributes.emoji,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "callout",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands, state }) => {
          const variant = attrs?.variant ?? "info";
          const emoji = attrs?.emoji ?? DEFAULT_CALLOUT_EMOJI[variant] ?? "💡";
          const { $from, $to } = state.selection;
          const range = $from.blockRange($to);
          const success = commands.wrapIn(this.name, { variant, emoji });
          if (success && range) {
            commands.setTextSelection({
              from: range.start + 2,
              to: range.start + 2,
            });
          }
          return success;
        },
      toggleCallout:
        (attrs) =>
        ({ commands, state }) => {
          const variant = attrs?.variant ?? "info";
          const emoji = attrs?.emoji ?? DEFAULT_CALLOUT_EMOJI[variant] ?? "💡";
          const { $from, $to } = state.selection;
          const range = $from.blockRange($to);
          const success = commands.toggleWrap(this.name, { variant, emoji });
          if (success && range) {
            commands.setTextSelection({
              from: range.start + 2,
              to: range.start + 2,
            });
          }
          return success;
        },
      unsetCallout:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^::: $/,
        type: this.type,
      }),
    ];
  },
});
