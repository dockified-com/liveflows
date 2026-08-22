import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { type Editor, Extension } from "@tiptap/react";

export interface FindMatch {
  from: number;
  to: number;
}

export interface FindPluginState {
  query: string;
  matches: FindMatch[];
  currentIndex: number;
  decorations: DecorationSet;
}

export const findPluginKey = new PluginKey<FindPluginState>("liveflowsFind");

export function findMatchesInDoc(
  doc: ProseMirrorNode,
  query: string,
): FindMatch[] {
  if (!query || !query.trim()) return [];
  const normalizedQuery = query.toLowerCase();
  const matches: FindMatch[] = [];

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const text = node.text.toLowerCase();
      let index = text.indexOf(normalizedQuery);
      while (index !== -1) {
        matches.push({
          from: pos + index,
          to: pos + index + normalizedQuery.length,
        });
        index = text.indexOf(normalizedQuery, index + 1);
      }
    }
  });

  return matches;
}

export function buildFindDecorations(
  doc: ProseMirrorNode,
  matches: FindMatch[],
  currentIndex: number,
): DecorationSet {
  if (matches.length === 0) return DecorationSet.empty;
  const decos: Decoration[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const isCurrent = i === currentIndex;
    decos.push(
      Decoration.inline(match.from, match.to, {
        class: isCurrent ? "find-match-current" : "find-match",
      }),
    );
  }
  return DecorationSet.create(doc, decos);
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    find: {
      setFindQuery: (query: string) => ReturnType;
      findNext: () => ReturnType;
      findPrev: () => ReturnType;
      clearFind: () => ReturnType;
    };
  }
}

export const findExtension = Extension.create({
  name: "liveflowsFind",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindPluginState>({
        key: findPluginKey,
        state: {
          init() {
            return {
              query: "",
              matches: [],
              currentIndex: -1,
              decorations: DecorationSet.empty,
            };
          },
          apply(tr, prev, _oldState, newState) {
            const meta = tr.getMeta(findPluginKey) as
              | { type: "setQuery"; query: string }
              | { type: "next" }
              | { type: "prev" }
              | { type: "clear" }
              | undefined;

            if (meta) {
              if (meta.type === "clear") {
                return {
                  query: "",
                  matches: [],
                  currentIndex: -1,
                  decorations: DecorationSet.empty,
                };
              }

              if (meta.type === "setQuery") {
                const query = meta.query;
                if (!query || !query.trim()) {
                  return {
                    query: "",
                    matches: [],
                    currentIndex: -1,
                    decorations: DecorationSet.empty,
                  };
                }
                const matches = findMatchesInDoc(newState.doc, query);
                const currentIndex = matches.length > 0 ? 0 : -1;
                return {
                  query,
                  matches,
                  currentIndex,
                  decorations: buildFindDecorations(
                    newState.doc,
                    matches,
                    currentIndex,
                  ),
                };
              }

              if (meta.type === "next") {
                if (prev.matches.length === 0) return prev;
                const currentIndex =
                  (prev.currentIndex + 1) % prev.matches.length;
                return {
                  ...prev,
                  currentIndex,
                  decorations: buildFindDecorations(
                    newState.doc,
                    prev.matches,
                    currentIndex,
                  ),
                };
              }

              if (meta.type === "prev") {
                if (prev.matches.length === 0) return prev;
                const currentIndex =
                  (prev.currentIndex - 1 + prev.matches.length) %
                  prev.matches.length;
                return {
                  ...prev,
                  currentIndex,
                  decorations: buildFindDecorations(
                    newState.doc,
                    prev.matches,
                    currentIndex,
                  ),
                };
              }
            }

            if (tr.docChanged && prev.query) {
              const matches = findMatchesInDoc(newState.doc, prev.query);
              let currentIndex = prev.currentIndex;
              if (matches.length === 0) {
                currentIndex = -1;
              } else if (currentIndex >= matches.length || currentIndex < 0) {
                currentIndex = 0;
              }
              return {
                query: prev.query,
                matches,
                currentIndex,
                decorations: buildFindDecorations(
                  newState.doc,
                  matches,
                  currentIndex,
                ),
              };
            }

            return prev;
          },
        },
        props: {
          decorations(state) {
            return (
              findPluginKey.getState(state)?.decorations ?? DecorationSet.empty
            );
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setFindQuery:
        (query: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(findPluginKey, { type: "setQuery", query });
            dispatch(tr);
          }
          return true;
        },
      findNext:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(findPluginKey, { type: "next" });
            dispatch(tr);
          }
          return true;
        },
      findPrev:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(findPluginKey, { type: "prev" });
            dispatch(tr);
          }
          return true;
        },
      clearFind:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(findPluginKey, { type: "clear" });
            dispatch(tr);
          }
          return true;
        },
    };
  },
});

export function getFindState(editor: Editor): FindPluginState | undefined {
  if (!editor?.state) return undefined;
  return findPluginKey.getState(editor.state);
}
