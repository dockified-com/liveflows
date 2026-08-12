"use client";

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
  if (tabs.length === 0) return null;

  return (
    <div className="flex h-10 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface-subtle)] px-2 select-none overflow-x-auto">
      <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
        {tabs.map((tab) => {
          const isActive =
            tab.id === activeFileId ||
            (isSplit && (tab.id === leftFileId || tab.id === rightFileId));
          const isLeft = isSplit && tab.id === leftFileId;
          const isRight = isSplit && tab.id === rightFileId;

          return (
            <div
              key={tab.id}
              onClick={() => onActivate(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onActivate(tab.id);
                }
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              className={`group relative flex h-8 items-center gap-2 rounded-t-md px-3 text-xs font-medium cursor-pointer transition-all ${
                isActive
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-xs border-t-2 border-t-[var(--accent)]"
                  : "text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="opacity-80">
                {tab.type === "canvas" ? "🎨" : "📄"}
              </span>
              <span className="max-w-[120px] truncate">{tab.name}</span>

              {isSplit && (isLeft || isRight) && (
                <span className="rounded bg-[var(--surface-hover)] px-1 py-0.2 text-[10px] text-[var(--ink-tertiary)] uppercase font-mono">
                  {isLeft ? "Left" : "Right"}
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-hover)] text-[var(--ink-tertiary)] hover:text-[var(--ink)] transition-opacity"
                aria-label={`Close ${tab.name}`}
              >
                <Icon size="sm">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </Icon>
              </button>
            </div>
          );
        })}
      </div>

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
