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
    <header className="flex items-center justify-between border-b border-[#21262d] bg-[#161b22] px-4 h-14 font-mono text-xs text-[#8b949e]">
      <nav aria-label="Main navigation" className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          className="rounded border border-[#30363d] bg-[#0e1117] p-1.5 text-[#f0f6fc] hover:border-[#ff9e00] hover:text-[#ff9e00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9e00] transition-colors"
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
        <div className="flex items-center gap-2 border-l border-[#30363d] pl-4">
          <span className="font-bold uppercase tracking-wider text-[#ff9e00]">
            :: LIVEFLOWS
          </span>
          <span className="text-[#30363d]">/</span>
          <OrganizationSwitcher
            appearance={{
              elements: {
                rootBox: "text-[#f0f6fc]",
                organizationSwitcherTrigger:
                  "text-[#f0f6fc] font-mono hover:bg-[#21262d] py-1 px-2 rounded border border-[#30363d]",
              },
            }}
          />
        </div>
      </nav>

      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
          </span>
          <span className="text-[#f0f6fc]">LIVE SYNC</span>
          <span className="text-[#484f58]">(12ms)</span>
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
