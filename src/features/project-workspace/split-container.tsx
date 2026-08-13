"use client";

import type React from "react";
import { useState } from "react";

export interface SplitPaneContainerProps {
  isSplit: boolean;
  dividerRatio?: number;
  onRatioChange?: (newRatio: number) => void;
  leftPane: React.ReactNode;
  rightPane?: React.ReactNode;
  mobileVisibleParticipant?: "left" | "right" | null;
}

export function SplitPaneContainer({
  isSplit,
  dividerRatio = 0.5,
  onRatioChange,
  leftPane,
  rightPane,
  mobileVisibleParticipant = null,
}: SplitPaneContainerProps) {
  const [isDragging, setIsDragging] = useState(false);

  if (!isSplit || !rightPane) {
    return (
      <div className="h-full w-full flex-1 overflow-hidden">{leftPane}</div>
    );
  }

  // Clamped ratio between 20% and 80%
  const leftWidthPct = Math.min(80, Math.max(20, dividerRatio * 100));

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const initialRatio = dividerRatio;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaRatio = deltaX / containerWidth;
      const nextRatio = Math.min(0.8, Math.max(0.2, initialRatio + deltaRatio));
      if (onRatioChange) {
        onRatioChange(nextRatio);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="relative flex h-full w-full flex-1 overflow-hidden">
      {/* Desktop Split View (hidden on mobile <768px) */}
      <div className="hidden md:flex h-full w-full">
        <div
          className="h-full overflow-hidden"
          style={{ width: `${leftWidthPct}%` }}
        >
          {leftPane}
        </div>

        {/* Divider / Resizer */}
        <button
          type="button"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(leftWidthPct)}
          aria-valuemin={20}
          aria-valuemax={80}
          aria-label="Resize split panes"
          onMouseDown={handleMouseDown}
          onKeyDown={(e) => {
            if (!onRatioChange) return;
            const currentRatio = dividerRatio;
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              onRatioChange(Math.max(0.2, currentRatio - 0.05));
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              onRatioChange(Math.min(0.8, currentRatio + 0.05));
            } else if (e.key === "Home") {
              e.preventDefault();
              onRatioChange(0.2);
            } else if (e.key === "End") {
              e.preventDefault();
              onRatioChange(0.8);
            }
          }}
          className={`relative z-10 w-2 cursor-col-resize hover:bg-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
            isDragging ? "bg-[var(--accent)]" : "bg-[var(--border)]"
          }`}
        />

        <div
          className="h-full flex-1 overflow-hidden"
          style={{ width: `${100 - leftWidthPct}%` }}
        >
          {rightPane}
        </div>
      </div>

      {/* Mobile View (<768px): Show 1 visible participant at a time */}
      <div className="flex md:hidden h-full w-full overflow-hidden">
        {mobileVisibleParticipant === "right" ? rightPane : leftPane}
      </div>
    </div>
  );
}
