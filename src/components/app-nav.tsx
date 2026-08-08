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
    <header className="flex items-center justify-between border-b border-gray-200 px-4 h-14">
      <nav aria-label="Main navigation" className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          className="rounded p-1.5 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <OrganizationSwitcher />
      </nav>
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
