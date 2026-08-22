"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export type ThemeMode = "light" | "dark";

export interface ThemeToggleProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => onThemeChange(isDark ? "light" : "dark")}
      className="h-7 w-7 p-0 text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)] cursor-pointer"
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <Icon size="sm">
        {isDark ? (
          // Sun Icon
          <>
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </>
        ) : (
          // Moon Icon
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </Icon>
    </Button>
  );
}
