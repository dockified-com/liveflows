import { Extension, ReactRenderer } from "@tiptap/react";
import Suggestion, {
  exitSuggestion,
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { isActionAvailable, runSlashAction } from "../lib/slash-actions";
import { filterCommands, type SlashCommand } from "../lib/slash-commands";
import { SlashMenu, type SlashMenuRef } from "../ui/slash-menu";

export const slashSuggestionExtension = Extension.create({
  name: "slashSuggestion",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommand, SlashCommand>({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        items: ({ query, editor }) => {
          return filterCommands(query).filter((c) =>
            isActionAvailable(editor, c.action),
          );
        },
        command: ({ editor, range, props }) => {
          runSlashAction(editor, props.action, range);
        },
        render: () => {
          let component: ReactRenderer<SlashMenuRef> | null = null;
          let unmount: (() => void) | null = null;

          return {
            onStart: (props: SuggestionProps<SlashCommand, SlashCommand>) => {
              component = new ReactRenderer(SlashMenu, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              unmount = props.mount(component.element);
            },

            onUpdate(props: SuggestionProps<SlashCommand, SlashCommand>) {
              component?.updateProps(props);
            },

            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event.key === "Escape") {
                exitSuggestion(props.view);
                return true;
              }

              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit() {
              unmount?.();
              component?.destroy();
              component = null;
              unmount = null;
            },
          };
        },
      }),
    ];
  },
});
