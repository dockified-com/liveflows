"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ColorPopover } from "./color-popover";
import { LinkEditor } from "./link-editor";
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

const BLOCK_TYPES = [
  { id: "paragraph", label: "Text" },
  { id: "h1", label: "Heading 1" },
  { id: "h2", label: "Heading 2" },
  { id: "h3", label: "Heading 3" },
  { id: "bulletList", label: "Bulleted list" },
  { id: "orderedList", label: "Numbered list" },
  { id: "taskList", label: "To-do list" },
  { id: "quote", label: "Quote" },
  { id: "codeBlock", label: "Code block" },
];

const AI_ACTIONS = [
  { id: "improve", label: "Improve writing", icon: "✨" },
  { id: "fix", label: "Fix spelling & grammar", icon: "🔤" },
  { id: "shorten", label: "Make shorter", icon: "✂️" },
  { id: "lengthen", label: "Make longer", icon: "📝" },
  { id: "summarize", label: "Summarize", icon: "📋" },
  { id: "translate", label: "Translate", icon: "🌐" },
];

function isButtonActive(editor: Editor, btn: ToolbarButton): boolean {
  if (btn.mark) {
    return editor.isActive(btn.mark, btn.markOptions);
  }
  if (btn.markOptions) {
    return editor.isActive(btn.markOptions);
  }
  return false;
}

function getActiveBlockLabel(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "Heading 1";
  if (editor.isActive("heading", { level: 2 })) return "Heading 2";
  if (editor.isActive("heading", { level: 3 })) return "Heading 3";
  if (editor.isActive("bulletList")) return "Bulleted list";
  if (editor.isActive("orderedList")) return "Numbered list";
  if (editor.isActive("taskList")) return "To-do list";
  if (editor.isActive("blockquote")) return "Quote";
  if (editor.isActive("codeBlock")) return "Code block";
  return "Text";
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
  const [isBlockTypeOpen, setIsBlockTypeOpen] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false);

  const blockTypeRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);

  const uniqueId = useId();

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        aiMenuRef.current &&
        !aiMenuRef.current.contains(e.target as Node)
      ) {
        setIsAiMenuOpen(false);
      }
      if (
        blockTypeRef.current &&
        !blockTypeRef.current.contains(e.target as Node)
      ) {
        setIsBlockTypeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

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
  const currentLinkHref = (editor.getAttributes("link")?.href as string) || "";
  const activeBlockLabel = getActiveBlockLabel(editor);

  const handleApplyBlockType = (typeId: string) => {
    switch (typeId) {
      case "paragraph":
        editor.chain().focus().setParagraph().run();
        break;
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "taskList":
        (
          editor.chain().focus() as unknown as Record<
            string,
            () => { run: () => boolean }
          >
        )
          .toggleTaskList?.()
          .run();
        break;
      case "quote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "codeBlock":
        editor.chain().focus().toggleCodeBlock().run();
        break;
    }
    setIsBlockTypeOpen(false);
  };

  const handleApplyLink = (url: string) => {
    if (hasSetLink) {
      (
        editor.commands as unknown as Record<
          string,
          (opts: { href: string }) => boolean
        >
      ).setLink?.({ href: url });
    }
    setIsLinkEditorOpen(false);
  };

  const handleRemoveLink = () => {
    if (hasSetLink) {
      (
        editor.commands as unknown as Record<string, () => boolean>
      ).unsetLink?.();
    }
    setIsLinkEditorOpen(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={0}
      appendTo={() => document.body}
      shouldShow={({ editor: e, from, to }) =>
        shouldShowBubble({ editor: e, from, to })
      }
      className="relative flex items-center gap-0.5 rounded-xl border border-[var(--line)] bg-[var(--card)]/98 backdrop-blur-md px-1.5 py-1 shadow-2xl z-50 text-[var(--ink)] font-sans transition-all duration-150 animate-in fade-in zoom-in-95"
      role="toolbar"
      aria-label="Floating formatting options"
    >
      {/* Ask AI Assistant Button */}
      <div ref={aiMenuRef} className="relative inline-block">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Ask AI"
          onClick={() => setIsAiMenuOpen((prev) => !prev)}
          className="h-7 gap-1 px-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
        >
          <span className="text-xs">✨</span>
          <span>Ask AI</span>
        </Button>

        {isAiMenuOpen && (
          <div
            role="menu"
            aria-label="AI actions"
            className="absolute left-0 top-full mt-1.5 z-50 flex w-48 flex-col rounded-xl border border-[var(--line)] bg-[var(--card)]/98 backdrop-blur-md p-1 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-100 ease-out"
          >
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
              AI Assistant
            </div>
            {AI_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                onClick={() => setIsAiMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--bg-2)] transition-colors cursor-pointer text-left"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        aria-hidden="true"
        className="mx-0.5 h-4 w-px shrink-0 bg-[var(--line)]"
      />

      {/* Turn Into / Block Type Dropdown */}
      <div ref={blockTypeRef} className="relative inline-block">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          aria-label="Turn into"
          onClick={() => setIsBlockTypeOpen((prev) => !prev)}
          className="h-7 gap-1 px-2 text-xs text-[var(--ink)] hover:bg-[var(--bg-2)] transition-colors cursor-pointer"
        >
          <span className="truncate max-w-[80px]">{activeBlockLabel}</span>
          <Icon size="sm" className="text-[var(--ink-faint)]">
            <polyline points="6 9 12 15 18 9" />
          </Icon>
        </Button>

        {isBlockTypeOpen && (
          <div
            role="menu"
            aria-label="Block types"
            className="absolute left-0 top-full mt-1.5 z-50 flex w-40 flex-col rounded-xl border border-[var(--line)] bg-[var(--card)]/98 backdrop-blur-md p-1 shadow-2xl text-left max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ease-out"
          >
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.id}
                type="button"
                role="menuitem"
                onClick={() => handleApplyBlockType(bt.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  activeBlockLabel === bt.label
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                    : "text-[var(--ink)] hover:bg-[var(--bg-2)]"
                }`}
              >
                <span>{bt.label}</span>
                {activeBlockLabel === bt.label && (
                  <span className="text-[var(--accent)]">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        aria-hidden="true"
        className="mx-0.5 h-4 w-px shrink-0 bg-[var(--line)]"
      />

      {/* Mark Formatting Buttons (Bold, Italic, Underline, Strike, Code) */}
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
        className="mx-0.5 h-4 w-px shrink-0 bg-[var(--line)]"
      />

      {/* Link Popover */}
      <div className="relative inline-block">
        <Button
          ref={linkButtonRef}
          variant="ghost"
          size="sm"
          aria-label="Link"
          aria-pressed={isLinkActive}
          disabled={!hasSetLink}
          title={hasSetLink ? "Link" : "Link (requires link extension)"}
          onClick={() => {
            if (hasSetLink) {
              setIsLinkEditorOpen((prev) => !prev);
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

        {isLinkEditorOpen && (
          <div className="absolute left-0 top-full mt-2 z-50">
            <LinkEditor
              initialUrl={currentLinkHref}
              onApply={handleApplyLink}
              onRemove={isLinkActive ? handleRemoveLink : undefined}
              onCancel={() => setIsLinkEditorOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Color & Highlight Popovers */}
      <ColorPopover editor={editor} kind="text" />
      <ColorPopover editor={editor} kind="highlight" />
    </BubbleMenu>
  );
}
