import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useEffect, useState } from "react";
import { extractOutline, type OutlineEntry } from "../lib/outline";

export function TocView({ editor }: NodeViewProps) {
  const [outline, setOutline] = useState<OutlineEntry[]>(() => {
    if (!editor?.getJSON) return [];
    return extractOutline(editor.getJSON());
  });

  useEffect(() => {
    if (!editor?.on) return;
    const updateOutline = () => {
      setOutline(extractOutline(editor.getJSON()));
    };
    updateOutline();
    editor.on("update", updateOutline);
    return () => {
      editor.off("update", updateOutline);
    };
  }, [editor]);

  const handleHeadingClick = (id: string) => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <NodeViewWrapper
      as="div"
      contentEditable={false}
      className="my-4 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 font-sans text-sm select-none"
    >
      <nav aria-label="Table of contents">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
          On this page
        </div>
        {outline.length === 0 ? (
          <p className="m-0 text-xs italic text-[var(--ink-soft)]">
            No headings yet
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {outline.map((entry, index) => {
              const indentClass =
                entry.level === 3
                  ? "pl-6"
                  : entry.level === 2
                    ? "pl-3"
                    : "pl-0";

              return (
                <li
                  key={entry.id ?? `${index}-${entry.text}`}
                  className={indentClass}
                >
                  {entry.id ? (
                    <button
                      type="button"
                      onClick={() => handleHeadingClick(entry.id as string)}
                      className="cursor-pointer py-0.5 text-left text-sm text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
                    >
                      {entry.text}
                    </button>
                  ) : (
                    <span className="py-0.5 text-left text-sm text-[var(--ink-soft)]">
                      {entry.text}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </NodeViewWrapper>
  );
}
