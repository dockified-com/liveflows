"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/ui/icon";
import type { TurnIntoTarget } from "./block-actions";

export interface BlockMenuProps {
  hasBlockId?: boolean;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onTurnInto?: (target: TurnIntoTarget) => void;
  onCopyLink?: () => void;
  onClose?: () => void;
  id?: string;
  className?: string;
}

const TURN_INTO_OPTIONS: Array<{
  id: TurnIntoTarget;
  label: string;
}> = [
  { id: "paragraph", label: "Text" },
  { id: "heading1", label: "Heading 1" },
  { id: "heading2", label: "Heading 2" },
  { id: "heading3", label: "Heading 3" },
  { id: "bulletList", label: "Bullet list" },
  { id: "orderedList", label: "Numbered list" },
  { id: "blockquote", label: "Quote" },
  { id: "callout", label: "Callout" },
];

export function BlockMenu({
  hasBlockId = true,
  onDuplicate,
  onDelete,
  onTurnInto,
  onCopyLink,
  onClose,
  id = "block-menu",
  className = "",
}: BlockMenuProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<"turnInto" | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const submenuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Top level menu items
  const mainItems = useMemo(
    () => [
      {
        id: "ask-ai",
        label: "Ask AI",
        disabled: true,
        hint: "Coming soon",
        icon: (
          <Icon size="sm">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
          </Icon>
        ),
        onClick: () => {},
      },
      {
        id: "duplicate",
        label: "Duplicate",
        disabled: false,
        icon: (
          <Icon size="sm">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </Icon>
        ),
        onClick: () => {
          onDuplicate?.();
          onClose?.();
        },
      },
      {
        id: "turn-into",
        label: "Turn into",
        disabled: false,
        hasSubmenu: true,
        icon: (
          <Icon size="sm">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </Icon>
        ),
        onClick: () => {
          setActiveSubmenu((prev) => (prev === "turnInto" ? null : "turnInto"));
        },
      },
      {
        id: "copy-link",
        label: "Copy block link",
        disabled: !hasBlockId,
        icon: (
          <Icon size="sm">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </Icon>
        ),
        onClick: () => {
          if (!hasBlockId) return;
          onCopyLink?.();
          onClose?.();
        },
      },
      {
        id: "delete",
        label: "Delete",
        disabled: false,
        destructive: true,
        icon: (
          <Icon size="sm">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </Icon>
        ),
        onClick: () => {
          onDelete?.();
          onClose?.();
        },
      },
    ],
    [hasBlockId, onClose, onCopyLink, onDelete, onDuplicate],
  );

  // Focus initial element on mount
  useEffect(() => {
    // Focus first non-disabled item or item 0
    const firstEnabledIdx = mainItems.findIndex((item) => !item.disabled);
    const initialIndex = firstEnabledIdx >= 0 ? firstEnabledIdx : 0;
    setFocusedIndex(initialIndex);
    itemRefs.current[initialIndex]?.focus();
  }, [mainItems]);

  // Click outside to dismiss
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activeSubmenu === "turnInto") {
        if (e.key === "ArrowLeft" || e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setActiveSubmenu(null);
          itemRefs.current[2]?.focus(); // refocus "turn into"
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          const nextIdx = (focusedIndex + 1) % TURN_INTO_OPTIONS.length;
          setFocusedIndex(nextIdx);
          submenuItemRefs.current[nextIdx]?.focus();
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          const prevIdx =
            (focusedIndex - 1 + TURN_INTO_OPTIONS.length) %
            TURN_INTO_OPTIONS.length;
          setFocusedIndex(prevIdx);
          submenuItemRefs.current[prevIdx]?.focus();
          return;
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const nextIdx = (focusedIndex + 1) % mainItems.length;
          setFocusedIndex(nextIdx);
          itemRefs.current[nextIdx]?.focus();
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prevIdx =
            (focusedIndex - 1 + mainItems.length) % mainItems.length;
          setFocusedIndex(prevIdx);
          itemRefs.current[prevIdx]?.focus();
          break;
        }
        case "ArrowRight": {
          if (mainItems[focusedIndex]?.id === "turn-into") {
            e.preventDefault();
            setActiveSubmenu("turnInto");
            setFocusedIndex(0);
            requestAnimationFrame(() => {
              submenuItemRefs.current[0]?.focus();
            });
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          e.stopPropagation();
          onClose?.();
          break;
        }
        case "Tab": {
          onClose?.();
          break;
        }
      }
    },
    [activeSubmenu, focusedIndex, mainItems, onClose],
  );

  return (
    <div
      ref={containerRef}
      id={id}
      role="menu"
      aria-label="Block options"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={`relative z-50 flex w-52 flex-col rounded-xl border border-[var(--line)] bg-[var(--card)] p-1 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.1),0_8px_10px_-6px_rgba(15,23,42,0.1)] font-sans ${className}`}
    >
      {mainItems.map((item, index) => {
        const isFocused = focusedIndex === index && activeSubmenu === null;
        const isSeparatorBefore = item.destructive;

        return (
          <div key={item.id} className="contents">
            {isSeparatorBefore ? (
              <hr className="my-1 h-px border-0 bg-[var(--line)]" />
            ) : null}
            <button
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              tabIndex={isFocused ? 0 : -1}
              onClick={item.onClick}
              onMouseEnter={() => {
                setFocusedIndex(index);
                if (item.id === "turn-into") {
                  setActiveSubmenu("turnInto");
                } else {
                  setActiveSubmenu(null);
                }
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus:bg-[var(--bg-2)] ${
                item.disabled
                  ? "opacity-50 text-[var(--ink-faint)]"
                  : item.destructive
                    ? "text-[var(--destructive)] hover:bg-[var(--destructive-soft)] focus:bg-[var(--destructive-soft)]"
                    : "text-[var(--ink)] hover:bg-[var(--bg-2)]"
              } ${isFocused && !item.disabled ? "bg-[var(--bg-2)]" : ""}`}
            >
              <span
                className={`shrink-0 ${
                  item.destructive
                    ? "text-[var(--destructive)]"
                    : item.disabled
                      ? "text-[var(--ink-faint)]"
                      : "text-[var(--ink-soft)]"
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
              {item.hint ? (
                <span className="ml-auto text-[10px] text-[var(--ink-faint)]">
                  {item.hint}
                </span>
              ) : null}
              {item.hasSubmenu ? (
                <span className="ml-auto text-[var(--ink-faint)]">
                  <Icon size="sm">
                    <polyline points="9 18 15 12 9 6" />
                  </Icon>
                </span>
              ) : null}
            </button>
          </div>
        );
      })}

      {activeSubmenu === "turnInto" && (
        <div
          role="menu"
          aria-label="Turn into options"
          className="absolute left-full top-12 ml-1 z-50 flex w-44 flex-col rounded-xl border border-[var(--line)] bg-[var(--card)] p-1 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.1),0_8px_10px_-6px_rgba(15,23,42,0.1)]"
        >
          {TURN_INTO_OPTIONS.map((opt, subIndex) => (
            <button
              key={opt.id}
              ref={(el) => {
                submenuItemRefs.current[subIndex] = el;
              }}
              role="menuitem"
              type="button"
              tabIndex={focusedIndex === subIndex ? 0 : -1}
              onClick={() => {
                onTurnInto?.(opt.id);
                onClose?.();
              }}
              onMouseEnter={() => setFocusedIndex(subIndex)}
              className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--bg-2)] focus:bg-[var(--bg-2)] focus-visible:outline-none transition-colors cursor-pointer text-left"
            >
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
