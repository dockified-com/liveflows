"use client";

import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

export interface TabItem {
  id: string;
  name: string;
  type: "canvas" | "document";
}

export interface WorkspaceTabBarProps {
  tabs: TabItem[];
  activeFileId: string | null;
  leftFileId?: string | null;
  rightFileId?: string | null;
  isSplit?: boolean;
  onActivate: (fileId: string) => void;
  onClose: (fileId: string) => void;
  onSplitWith?: (leftId: string, rightId: string) => void;
  onCloseSplit?: () => void;
}

interface SortableTabProps {
  tab: TabItem;
  isActive: boolean;
  isLeft: boolean;
  isRight: boolean;
  isFocused: boolean;
  isSplit: boolean;
  rovingId: string | null;
  setRovingId: (id: string) => void;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onKeyDown: (e: React.KeyboardEvent, tab: TabItem) => void;
  tabRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}

function SortableTab({
  tab,
  isActive,
  isLeft,
  isRight,
  isFocused,
  isSplit,
  setRovingId,
  onActivate,
  onClose,
  onKeyDown,
  tabRefs,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        if (el) tabRefs.current.set(tab.id, el);
        else tabRefs.current.delete(tab.id);
      }}
      style={style}
      {...attributes}
      {...listeners}
      role="tab"
      id={`tab-${tab.id}`}
      aria-selected={isActive}
      aria-label={`${tab.name} (${tab.type})`}
      tabIndex={isFocused ? 0 : -1}
      onClick={() => {
        setRovingId(tab.id);
        onActivate(tab.id);
      }}
      onKeyDown={(e) => onKeyDown(e, tab)}
      onFocus={() => setRovingId(tab.id)}
      className={`group relative flex h-8 items-center gap-2 rounded-t-md px-3 text-xs font-medium cursor-pointer transition-colors touch-none select-none ${
        isActive
          ? "bg-[var(--surface)] text-[var(--ink)] shadow-xs border-t-2 border-t-[var(--accent)]"
          : "text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
      }`}
    >
      <span className="shrink-0 text-[var(--ink-tertiary)]" aria-hidden="true">
        {tab.type === "canvas" ? (
          <Icon size="sm">
            <circle cx="12" cy="12" r="10" />
            <circle cx="8.5" cy="14" r="1.5" />
            <circle cx="15.5" cy="14" r="1.5" />
            <circle cx="12" cy="9" r="1.5" />
          </Icon>
        ) : (
          <Icon size="sm">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </Icon>
        )}
      </span>
      <span className="max-w-[120px] truncate">{tab.name}</span>

      {isSplit && (isLeft || isRight) && (
        <span className="rounded bg-[var(--surface-hover)] px-1 py-0.2 text-[10px] text-[var(--ink-tertiary)] uppercase font-mono">
          {isLeft ? "Left" : "Right"}
        </span>
      )}

      <span
        aria-hidden="true"
        onClick={(e) => {
          e.stopPropagation();
          onClose(tab.id);
        }}
        className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-hover)] text-[var(--ink-tertiary)] hover:text-[var(--ink)] transition-opacity cursor-pointer"
        title={`Close ${tab.name}`}
      >
        <Icon size="sm">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </Icon>
      </span>
    </div>
  );
}

export function WorkspaceTabBar({
  tabs,
  activeFileId,
  leftFileId,
  rightFileId,
  isSplit = false,
  onActivate,
  onClose,
  onSplitWith,
  onCloseSplit,
}: WorkspaceTabBarProps) {
  const [rovingId, setRovingId] = useState<string | null>(
    tabs.length > 0 ? (activeFileId ?? tabs[0].id) : null,
  );
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());

  const focusTab = useCallback((id: string) => {
    setRovingId(id);
    requestAnimationFrame(() => {
      tabRefs.current.get(id)?.focus();
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, tab: TabItem) => {
      const idx = tabs.findIndex((t) => t.id === tab.id);
      switch (e.key) {
        case "ArrowRight": {
          e.preventDefault();
          const next = tabs[idx + 1];
          if (next) focusTab(next.id);
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const prev = tabs[idx - 1];
          if (prev) focusTab(prev.id);
          break;
        }
        case "Home": {
          e.preventDefault();
          if (tabs[0]) focusTab(tabs[0].id);
          break;
        }
        case "End": {
          e.preventDefault();
          const last = tabs[tabs.length - 1];
          if (last) focusTab(last.id);
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          onActivate(tab.id);
          break;
        }
        case "Delete":
        case "Backspace": {
          e.preventDefault();
          onClose(tab.id);
          break;
        }
      }
    },
    [tabs, focusTab, onActivate, onClose],
  );

  if (tabs.length === 0) return null;

  const tabIds = tabs.map((t) => t.id);

  return (
    <div className="flex h-10 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface-subtle)] px-2 select-none overflow-x-auto">
      <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
        <div
          role="tablist"
          aria-label="Open files"
          className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none"
        >
          {tabs.map((tab) => {
            const isActive =
              tab.id === activeFileId ||
              (isSplit && (tab.id === leftFileId || tab.id === rightFileId));
            const isLeft = isSplit && tab.id === leftFileId;
            const isRight = isSplit && tab.id === rightFileId;
            const isFocused = tab.id === rovingId;

            return (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={isActive}
                isLeft={isLeft}
                isRight={isRight}
                isFocused={isFocused}
                isSplit={isSplit}
                rovingId={rovingId}
                setRovingId={setRovingId}
                onActivate={onActivate}
                onClose={onClose}
                onKeyDown={handleKeyDown}
                tabRefs={tabRefs}
              />
            );
          })}
        </div>
      </SortableContext>

      <div className="flex items-center gap-1 pl-2 border-l border-[var(--border)]">
        {isSplit ? (
          <button
            type="button"
            onClick={onCloseSplit}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors"
            title="Single Pane Mode"
          >
            <Icon size="sm">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </Icon>
            <span>Single</span>
          </button>
        ) : (
          tabs.length >= 2 &&
          activeFileId && (
            <button
              type="button"
              onClick={() => {
                const secondary = tabs.find((t) => t.id !== activeFileId);
                if (secondary && onSplitWith) {
                  onSplitWith(activeFileId, secondary.id);
                }
              }}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors"
              title="Split View"
            >
              <Icon size="sm">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </Icon>
              <span>Split</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
