"use client";

import { useEffect } from "react";
import { AppRail } from "@/components/app-rail";
import { Icon } from "@/components/ui/icon";

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileDrawer({ isOpen, onClose, children }: MobileDrawerProps) {
  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      aria-label="Mobile Navigation Menu"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex md:hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Drawer Container */}
      <div className="relative flex w-[312px] max-w-[85vw] bg-[var(--card)] shadow-xl z-10 h-full overflow-hidden animate-in slide-in-from-left duration-200">
        {/* Fixed 72px Rail */}
        <AppRail />

        {/* Dynamic Sidebar Content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-[var(--line)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
              Navigation
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close mobile navigation"
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-faint)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <Icon size={16}>
                <path d="M18 6L6 18M6 6l12 12" />
              </Icon>
            </button>
          </div>
          <div className="flex-1 flex flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
}
