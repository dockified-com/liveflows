"use client";

import type { Editor } from "@tiptap/react";
import type React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export interface ColorPopoverProps {
  editor: Editor;
  kind: "text" | "highlight";
}

interface Swatch {
  id: string;
  label: string;
  token?: string;
  action: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
}

const TEXT_SWATCHES: Swatch[] = [
  {
    id: "default",
    label: "Remove text color",
    token: undefined,
    action: (e) => e.chain().focus().unsetColor().run(),
    isActive: (e) => !e.getAttributes("textStyle")?.color,
  },
  {
    id: "accent",
    label: "Accent",
    token: "var(--accent)",
    action: (e) => e.chain().focus().setColor("var(--accent)").run(),
    isActive: (e) => e.isActive("textStyle", { color: "var(--accent)" }),
  },
  {
    id: "success",
    label: "Success",
    token: "var(--success)",
    action: (e) => e.chain().focus().setColor("var(--success)").run(),
    isActive: (e) => e.isActive("textStyle", { color: "var(--success)" }),
  },
  {
    id: "warn",
    label: "Warning",
    token: "var(--warn)",
    action: (e) => e.chain().focus().setColor("var(--warn)").run(),
    isActive: (e) => e.isActive("textStyle", { color: "var(--warn)" }),
  },
  {
    id: "destructive",
    label: "Danger",
    token: "var(--destructive)",
    action: (e) => e.chain().focus().setColor("var(--destructive)").run(),
    isActive: (e) => e.isActive("textStyle", { color: "var(--destructive)" }),
  },
  {
    id: "muted",
    label: "Muted",
    token: "var(--ink-soft)",
    action: (e) => e.chain().focus().setColor("var(--ink-soft)").run(),
    isActive: (e) => e.isActive("textStyle", { color: "var(--ink-soft)" }),
  },
];

const HIGHLIGHT_SWATCHES: Swatch[] = [
  {
    id: "default",
    label: "Remove highlight",
    token: undefined,
    action: (e) => e.chain().focus().unsetHighlight().run(),
    isActive: (e) => !e.isActive("highlight"),
  },
  {
    id: "accent",
    label: "Accent",
    token: "var(--accent-soft)",
    action: (e) =>
      e.chain().focus().setHighlight({ color: "var(--accent-soft)" }).run(),
    isActive: (e) => e.isActive("highlight", { color: "var(--accent-soft)" }),
  },
  {
    id: "success",
    label: "Success",
    token: "var(--success-soft)",
    action: (e) =>
      e.chain().focus().setHighlight({ color: "var(--success-soft)" }).run(),
    isActive: (e) => e.isActive("highlight", { color: "var(--success-soft)" }),
  },
  {
    id: "warn",
    label: "Warning",
    token: "var(--warn-soft)",
    action: (e) =>
      e.chain().focus().setHighlight({ color: "var(--warn-soft)" }).run(),
    isActive: (e) => e.isActive("highlight", { color: "var(--warn-soft)" }),
  },
  {
    id: "destructive",
    label: "Danger",
    token: "var(--destructive-soft)",
    action: (e) =>
      e
        .chain()
        .focus()
        .setHighlight({ color: "var(--destructive-soft)" })
        .run(),
    isActive: (e) =>
      e.isActive("highlight", { color: "var(--destructive-soft)" }),
  },
  {
    id: "muted",
    label: "Muted",
    token: "var(--bg-2)",
    action: (e) =>
      e.chain().focus().setHighlight({ color: "var(--bg-2)" }).run(),
    isActive: (e) => e.isActive("highlight", { color: "var(--bg-2)" }),
  },
];

export function ColorPopover({ editor, kind }: ColorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const uniqueId = useId();
  const panelId = `color-popover-panel-${kind}-${uniqueId}`;

  const isText = kind === "text";
  const swatches = isText ? TEXT_SWATCHES : HIGHLIGHT_SWATCHES;
  const triggerLabel = isText ? "Text color" : "Highlight color";
  const panelLabel = isText ? "Text colors" : "Highlight colors";

  const isTriggerActive = isText
    ? Boolean(editor.getAttributes("textStyle")?.color)
    : editor.isActive("highlight");

  const focusItem = useCallback((index: number) => {
    setFocusedIndex(index);
    itemsRef.current[index]?.focus();
  }, []);

  const openPopover = useCallback(() => {
    const activeIndex = swatches.findIndex((s) => s.isActive(editor));
    const initialIndex = activeIndex >= 0 ? activeIndex : 0;
    setIsOpen(true);
    setFocusedIndex(initialIndex);
  }, [editor, swatches]);

  const closePopover = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const togglePopover = useCallback(() => {
    if (isOpen) {
      closePopover(false);
    } else {
      openPopover();
    }
  }, [isOpen, closePopover, openPopover]);

  // Focus the item when popover becomes open
  useEffect(() => {
    if (isOpen) {
      itemsRef.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Click outside to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closePopover(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, closePopover]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown": {
          e.preventDefault();
          const nextIndex = (focusedIndex + 1) % swatches.length;
          focusItem(nextIndex);
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          e.preventDefault();
          const prevIndex =
            (focusedIndex - 1 + swatches.length) % swatches.length;
          focusItem(prevIndex);
          break;
        }
        case "Home": {
          e.preventDefault();
          focusItem(0);
          break;
        }
        case "End": {
          e.preventDefault();
          focusItem(swatches.length - 1);
          break;
        }
        case "Escape": {
          e.preventDefault();
          e.stopPropagation();
          closePopover(true);
          break;
        }
        case "Tab": {
          closePopover(false);
          break;
        }
      }
    },
    [focusedIndex, swatches.length, focusItem, closePopover],
  );

  const handleSelectSwatch = useCallback(
    (swatch: Swatch) => {
      swatch.action(editor);
      closePopover(false);
    },
    [editor, closePopover],
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        type="button"
        aria-label={triggerLabel}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="listbox"
        onClick={togglePopover}
        className={`h-7 w-7 p-0 ${
          isTriggerActive || isOpen
            ? "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            : "text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
        }`}
      >
        <Icon size="sm" active={isTriggerActive || isOpen}>
          {isText ? (
            <>
              <path d="M4 20h16" />
              <path d="m6 16 6-12 6 12" />
              <path d="M8 12h8" />
            </>
          ) : (
            <>
              <path d="m9 11-6 6v3h3l6-6" />
              <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L15 4" />
            </>
          )}
        </Icon>
      </Button>

      {isOpen && (
        <div
          id={panelId}
          role="listbox"
          aria-label={panelLabel}
          aria-orientation="horizontal"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="absolute top-full left-0 mt-1 z-50 flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--card)] p-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
        >
          {swatches.map((swatch, index) => {
            const active = swatch.isActive(editor);
            return (
              <button
                key={swatch.id}
                ref={(el) => {
                  itemsRef.current[index] = el;
                }}
                role="option"
                type="button"
                tabIndex={focusedIndex === index ? 0 : -1}
                aria-label={swatch.label}
                aria-selected={active}
                onClick={() => handleSelectSwatch(swatch)}
                className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-1 ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] hover:bg-[var(--bg-2)]"
                }`}
              >
                {swatch.token ? (
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: swatch.token }}
                  />
                ) : (
                  <Icon size="sm" className="text-[var(--ink-soft)]">
                    <line x1="4" y1="4" x2="20" y2="20" />
                    <circle cx="12" cy="12" r="8" />
                  </Icon>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
