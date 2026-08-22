"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ColorPopover } from "./color-popover";
import {
  BUBBLE_BUTTON_IDS,
  TOOLBAR_BUTTONS,
  type ToolbarButton,
} from "./toolbar-buttons";

const glyphPaths: Record<
  "bold" | "italic" | "underline" | "strike" | "code" | "link",
  React.ReactNode
> = {
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
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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

/**
 * Pure predicate controlling when the floating bubble menu appears.
 *
 * Hidden when:
 * 1. Selection is empty (from === to)
 * 2. Editor is read-only (not editable)
 * 3. Selection is inside a code block
 */
export function shouldShowBubble(args: {
  editor: Editor;
  from: number;
  to: number;
}): boolean {
  const { editor, from, to } = args;
  if (!editor || !editor.isEditable) {
    return false;
  }
  if (from === to) {
    return false;
  }
  if (editor.isActive("codeBlock")) {
    return false;
  }
  return true;
}

export function BubbleToolbar({ editor }: { editor: Editor }) {
  if (!editor) return null;

  const bubbleButtons = TOOLBAR_BUTTONS.filter((btn) =>
    BUBBLE_BUTTON_IDS.includes(btn.id),
  );

  const hasSetLink =
    Boolean(editor.schema?.marks?.link) ||
    Boolean(
      editor.extensionManager?.extensions?.some((ext) => ext.name === "link"),
    );
  const isLinkActive = editor.isActive("link");

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={0}
      appendTo={() => document.body}
      shouldShow={({ editor: e, from, to }) =>
        shouldShowBubble({ editor: e, from, to })
      }
      className="flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--card)] p-1 shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
      role="toolbar"
      aria-label="Floating formatting options"
    >
      {bubbleButtons.map((btn) => {
        const active = isButtonActive(editor, btn);
        const glyph = btn.glyph as keyof typeof glyphPaths;

        return (
          <Button
            key={btn.id}
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
              {glyphPaths[glyph]}
            </Icon>
          </Button>
        );
      })}

      <div
        aria-hidden="true"
        className="mx-1 h-4 w-px shrink-0 bg-[var(--line)]"
      />

      <Button
        variant="ghost"
        size="sm"
        aria-label="Link"
        aria-pressed={isLinkActive}
        disabled={!hasSetLink}
        title={hasSetLink ? "Link" : "Link (requires link extension)"}
        onClick={() => {
          if (hasSetLink) {
            (
              editor.commands as unknown as Record<
                string,
                (opts: { href: string }) => boolean
              >
            ).setLink?.({ href: "" });
          }
        }}
        className={`h-7 w-7 p-0 ${
          isLinkActive
            ? "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            : "text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
        }`}
      >
        <Icon size="sm" active={isLinkActive}>
          {glyphPaths.link}
        </Icon>
      </Button>

      <ColorPopover editor={editor} kind="text" />
      <ColorPopover editor={editor} kind="highlight" />
    </BubbleMenu>
  );
}
