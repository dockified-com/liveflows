"use client";

import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/ui/icon";
import type { SlashAction, SlashCommand } from "../lib/slash-commands";

export interface SlashMenuProps {
  items: readonly SlashCommand[] | SlashCommand[];
  selectedIndex?: number;
  onSelect?: (command: SlashCommand) => void;
  command?: (command: SlashCommand) => void;
}

export interface SlashMenuRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const GROUP_LABELS: Record<SlashCommand["group"], string> = {
  basic: "Basic",
  layout: "Layout",
  technical: "Technical",
};

function SlashCommandIcon({
  action,
  active = false,
}: {
  action: SlashAction;
  active?: boolean;
}) {
  const iconClass = active ? "text-[var(--accent)]" : "text-[var(--ink-soft)]";

  switch (action) {
    case "paragraph":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h10" />
        </Icon>
      );
    case "heading1":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <path d="M4 12h8" />
          <path d="M4 18V6" />
          <path d="M12 18V6" />
          <path d="m17 12 3-2v8" />
        </Icon>
      );
    case "heading2":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <path d="M4 12h8" />
          <path d="M4 18V6" />
          <path d="M12 18V6" />
          <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
        </Icon>
      );
    case "heading3":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <path d="M4 12h8" />
          <path d="M4 18V6" />
          <path d="M12 18V6" />
          <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
          <path d="M17 18a2.5 2.5 0 0 0 4-1.5c0-1.5-1.5-2-2-2" />
        </Icon>
      );
    case "bulletList":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <line x1="9" y1="6" x2="20" y2="6" />
          <line x1="9" y1="12" x2="20" y2="12" />
          <line x1="9" y1="18" x2="20" y2="18" />
          <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
        </Icon>
      );
    case "orderedList":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <line x1="10" y1="6" x2="21" y2="6" />
          <line x1="10" y1="12" x2="21" y2="12" />
          <line x1="10" y1="18" x2="21" y2="18" />
          <path d="M4 6h1v4" />
          <path d="M4 10h2" />
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </Icon>
      );
    case "taskList":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <path d="m3 17 2 2 4-4" />
          <path d="m3 7 2 2 4-4" />
          <line x1="13" y1="6" x2="21" y2="6" />
          <line x1="13" y1="12" x2="21" y2="12" />
          <line x1="13" y1="18" x2="21" y2="18" />
        </Icon>
      );
    case "blockquote":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
        </Icon>
      );
    case "divider":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <line x1="3" y1="12" x2="21" y2="12" />
        </Icon>
      );
    case "callout":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </Icon>
      );
    case "table":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </Icon>
      );
    case "toc":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </Icon>
      );
    case "codeBlock":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </Icon>
      );
    case "blockMath":
      return (
        <Icon size="sm" active={active} className={iconClass}>
          <path d="M18 4H6l7 8-7 8h12" />
        </Icon>
      );
    default:
      return null;
  }
}

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  (props, ref) => {
    const { items, selectedIndex: controlledIndex, onSelect, command } = props;
    const [internalIndex, setInternalIndex] = useState(0);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    const selectedIndex =
      controlledIndex !== undefined ? controlledIndex : internalIndex;

    const selectItem = useCallback(
      (cmd: SlashCommand) => {
        if (onSelect) {
          onSelect(cmd);
        } else if (command) {
          command(cmd);
        }
      },
      [onSelect, command],
    );

    useEffect(() => {
      if (items.length >= 0) {
        setInternalIndex(0);
      }
    }, [items]);

    useEffect(() => {
      if (controlledIndex !== undefined) {
        setInternalIndex(controlledIndex);
      }
    }, [controlledIndex]);

    useEffect(() => {
      const el = itemRefs.current[selectedIndex];
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest" });
      }
    }, [selectedIndex]);

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
          if (event.key === "ArrowDown") {
            if (items.length === 0) return true;
            setInternalIndex((prev) => (prev + 1) % items.length);
            return true;
          }

          if (event.key === "ArrowUp") {
            if (items.length === 0) return true;
            setInternalIndex(
              (prev) => (prev - 1 + items.length) % items.length,
            );
            return true;
          }

          if (event.key === "Enter") {
            const selected = items[selectedIndex];
            if (selected) {
              selectItem(selected);
              return true;
            }
            return false;
          }

          return false;
        },
      }),
      [items, selectedIndex, selectItem],
    );

    const activeOptionId =
      items.length > 0 && items[selectedIndex]
        ? `slash-option-${items[selectedIndex].id}`
        : undefined;

    if (items.length === 0) {
      return (
        <div
          id="slash-menu"
          role="status"
          aria-label="Insert block"
          className="w-72 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-lg"
        >
          <div className="text-center text-sm text-[var(--ink-faint)] py-1">
            No blocks found
          </div>
        </div>
      );
    }

    return (
      <div
        id="slash-menu"
        role="listbox"
        tabIndex={-1}
        aria-label="Insert block"
        aria-activedescendant={activeOptionId}
        className="flex max-h-80 w-72 flex-col gap-0.5 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--card)] p-1 shadow-lg z-50 font-sans"
      >
        {items.map((cmd, index) => {
          const isSelected = index === selectedIndex;
          const prevCmd = index > 0 ? items[index - 1] : null;
          const showGroupHeader =
            prevCmd === null || prevCmd.group !== cmd.group;

          return (
            <React.Fragment key={cmd.id}>
              {showGroupHeader ? (
                <div
                  role="presentation"
                  className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)] select-none"
                >
                  {GROUP_LABELS[cmd.group] || cmd.group}
                </div>
              ) : null}
              <div
                id={`slash-option-${cmd.id}`}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => selectItem(cmd)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    selectItem(cmd);
                  }
                }}
                onMouseEnter={() => setInternalIndex(index)}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm cursor-pointer select-none transition-colors ${
                  isSelected
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                    : "text-[var(--ink)] hover:bg-[var(--bg-2)]"
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                    isSelected ? "bg-[var(--accent-soft)]" : "bg-[var(--bg-2)]"
                  }`}
                >
                  <SlashCommandIcon action={cmd.action} active={isSelected} />
                </div>
                <span className="truncate">{cmd.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  },
);

SlashMenu.displayName = "SlashMenu";
