"use client";

import { Icon } from "@/components/ui/icon";

export type ConnectionStatus =
  | "connected"
  | "reconnecting"
  | "offline"
  | "loading";

export interface PaneHeaderProps {
  fileName?: string;
  fileType?: "canvas" | "document" | string;
  connectionStatus: ConnectionStatus;
}

export function PaneHeader({
  fileName,
  fileType = "canvas",
  connectionStatus,
}: PaneHeaderProps) {
  return (
    <div className="flex h-8 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-xs font-sans select-none shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="shrink-0 text-[var(--ink-tertiary)]"
          aria-hidden="true"
        >
          {fileType === "canvas" ? (
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
        {fileName && (
          <span className="font-medium text-[var(--ink)] truncate max-w-[200px]">
            {fileName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {connectionStatus === "loading" && (
          <div className="flex items-center gap-1.5 text-[var(--ink-tertiary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--ink-tertiary)] animate-pulse" />
            <span className="text-[11px]">Connecting...</span>
          </div>
        )}

        {connectionStatus === "connected" && (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium">Live</span>
          </div>
        )}

        {connectionStatus === "reconnecting" && (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-[11px] font-medium">Reconnecting…</span>
          </div>
        )}

        {connectionStatus === "offline" && (
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-[11px] font-medium">Offline — read only</span>
          </div>
        )}
      </div>
    </div>
  );
}
