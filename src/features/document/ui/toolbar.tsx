"use client";

import type { Editor } from "@tiptap/react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TOOLBAR_BUTTONS, type ToolbarButton } from "./toolbar-buttons";

const glyphPaths: Record<ToolbarButton["glyph"], React.ReactNode> = {
  bold: (
    <>
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </>
  ),
  italic: (
    <>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </>
  ),
  underline: (
    <>
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </>
  ),
  strike: (
    <>
      <path d="M16 4H9a3 3 0 0 0-2.83 4" />
      <path d="M14 12a4 4 0 0 1 0 8H6" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </>
  ),
  code: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  h1: (
    <>
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="m17 12 3-2v8" />
    </>
  ),
  h2: (
    <>
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </>
  ),
  h3: (
    <>
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
      <path d="M17 18a2.5 2.5 0 0 0 4-1.5c0-1.5-1.5-2-2-2" />
    </>
  ),
  bulletList: (
    <>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  orderedList: (
    <>
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </>
  ),
  taskList: (
    <>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <line x1="13" y1="6" x2="21" y2="6" />
      <line x1="13" y1="12" x2="21" y2="12" />
      <line x1="13" y1="18" x2="21" y2="18" />
    </>
  ),
  quote: (
    <>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </>
  ),
  alignLeft: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="18" y2="18" />
    </>
  ),
  alignCenter: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="5" y1="18" x2="19" y2="18" />
    </>
  ),
  alignRight: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="6" y1="18" x2="20" y2="18" />
    </>
  ),
};

function isButtonActive(editor: Editor, btn: ToolbarButton): boolean {
  if (btn.mark) {
    return editor.isActive(btn.mark, btn.markOptions);
  }
  if (btn.markOptions) {
    return editor.isActive(btn.markOptions);
  }
  return false;
}

export function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting options"
      className="flex items-center gap-0.5 border-b border-[var(--line)] bg-[var(--card)] px-2 py-1 overflow-x-auto shrink-0"
    >
      {TOOLBAR_BUTTONS.map((btn, index) => {
        const prevBtn = index > 0 ? TOOLBAR_BUTTONS[index - 1] : null;
        const showSeparator = prevBtn !== null && prevBtn.group !== btn.group;
        const active = isButtonActive(editor, btn);

        return (
          <React.Fragment key={btn.id}>
            {showSeparator ? (
              <div
                aria-hidden="true"
                className="mx-1 h-4 w-px shrink-0 bg-[var(--line)]"
              />
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              aria-label={btn.label}
              aria-pressed={active}
              onClick={() => btn.action(editor)}
              className={`h-7 w-7 p-0 ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  : "text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
              }`}
            >
              <Icon size="sm" active={active}>
                {glyphPaths[btn.glyph]}
              </Icon>
            </Button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
