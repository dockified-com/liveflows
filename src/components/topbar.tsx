"use client";

import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  bold?: boolean;
}

export interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[];
  actionSlot?: React.ReactNode;
  variant?: "workspace" | "canvas";
  onMobileMenuToggle?: () => void;
  presence?: Array<{ id: string; name: string; avatar?: string }>;
}

export function Topbar({
  breadcrumbs = [{ label: "Workspace" }, { label: "acme-eng", bold: true }],
  actionSlot,
  variant = "workspace",
  onMobileMenuToggle,
  presence = [],
}: TopbarProps) {
  const isCanvas = variant === "canvas";
  const heightClass = isCanvas ? "h-[56px]" : "h-16";

  return (
    <header
      aria-label="Topbar"
      className={`flex ${heightClass} items-center justify-between border-b border-[var(--line)] bg-[var(--card)] px-[28px] gap-[14px] shrink-0 select-none`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu toggle (visible on screens < 768px) */}
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            aria-label="Open mobile navigation"
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:bg-[var(--bg-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <Icon size={18}>
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </Icon>
          </button>
        )}

        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumbs"
          className="flex items-center gap-1.5 text-[13.5px] text-[var(--ink-faint)] truncate"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label + idx}>
                {idx > 0 && (
                  <span className="text-[var(--ink-faint)] select-none">›</span>
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className={`hover:text-[var(--ink)] transition-colors ${
                      crumb.bold || isLast
                        ? "font-semibold text-[var(--ink)]"
                        : ""
                    }`}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={
                      crumb.bold || isLast
                        ? "font-semibold text-[var(--ink)]"
                        : ""
                    }
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Presence Avatars */}
        {presence.length > 0 && (
          <div
            className="flex -space-x-1.5 items-center mr-1"
            aria-label="Active collaborators"
          >
            {presence.map((user) => (
              <div
                key={user.id}
                title={user.name}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-white ring-2 ring-[var(--card)]"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-full w-full rounded-full"
                  />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
            ))}
          </div>
        )}

        {/* Notification Alert Icon */}
        <button
          type="button"
          aria-label="Alerts and Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <Icon size={16}>
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </Icon>
        </button>

        {/* Action Slot */}
        {actionSlot ? (
          actionSlot
        ) : (
          <Button variant="primary" size="sm">
            + New project
          </Button>
        )}
      </div>
    </header>
  );
}
