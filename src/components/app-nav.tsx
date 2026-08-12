"use client";

import {
  OrganizationSwitcher,
  Show,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { useUiStore } from "@/stores/ui";

export function AppNav() {
  const { sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--card)] px-4 font-sans text-xs text-[var(--ink-soft)]">
      <nav aria-label="Main navigation" className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--card)] p-1.5 text-[var(--ink)] hover:bg-[var(--bg-2)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] transition-colors"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <div className="flex items-center gap-2 border-l border-[var(--line)] pl-4">
          <span className="font-bold text-[13px] text-[var(--accent)]">
            LIVEFLOWS
          </span>
          <span className="text-[var(--ink-faint)]">/</span>
          <OrganizationSwitcher
            appearance={{
              elements: {
                rootBox: "text-[var(--ink)]",
                organizationSwitcherTrigger:
                  "text-[var(--ink)] font-sans hover:bg-[var(--bg-2)] py-1 px-2 rounded-[var(--radius-sm)] border border-[var(--line)]",
              },
            }}
          />
        </div>
      </nav>

      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]"></span>
          </span>
          <span className="text-[var(--ink)] font-medium">LIVE SYNC</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <SignInButton />
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
