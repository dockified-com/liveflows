"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

export interface RailItem {
  id: string;
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.ReactNode;
}

const mainRailItems: RailItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    icon: ({ className = "h-4 w-4" }) => (
      <Icon size={18} className={className}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V9.5z" />
      </Icon>
    ),
  },
  {
    id: "projects",
    label: "Projects",
    href: "/", // Workspace / projects entry point
    icon: ({ className = "h-4 w-4" }) => (
      <Icon size={18} className={className}>
        <path d="M3 4h18v4H3V4zm0 7h18v4H3v-4zm0 7h18v4H3v-4z" />
      </Icon>
    ),
  },
];

const footerRailItems: RailItem[] = [
  {
    id: "alerts",
    label: "Alerts",
    href: "#",
    icon: ({ className = "h-4 w-4" }) => (
      <Icon size={18} className={className}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
      </Icon>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    href: "#",
    icon: ({ className = "h-4 w-4" }) => (
      <Icon size={18} className={className}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </Icon>
    ),
  },
];

export function AppRail() {
  const pathname = usePathname();

  const isProjectsActive =
    pathname.startsWith("/w/") || pathname === "/" || pathname === "/dashboard";

  return (
    <aside
      aria-label="Application Rail"
      className="flex w-[72px] flex-col items-center border-r border-[var(--line)] bg-[var(--card)] py-4 gap-1 shrink-0 h-full select-none"
    >
      {/* LF Logo Badge */}
      <Link
        href="/"
        className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[13px] font-bold text-white shadow-xs hover:bg-[var(--accent-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        aria-label="LiveFlows Home"
      >
        LF
      </Link>

      {/* Main Rail Navigation */}
      <nav
        aria-label="Rail Navigation"
        className="flex flex-col gap-1 w-full items-center"
      >
        {mainRailItems.map((item) => {
          const isActive =
            item.id === "projects" ? isProjectsActive : pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex h-[52px] w-[52px] flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] text-[10.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                isActive
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--ink-faint)] hover:bg-[var(--bg-2)] hover:text-[var(--ink-soft)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.icon({ className: "h-[18px] w-[18px]" })}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Footer Rail Navigation */}
      <div className="flex flex-col gap-1 w-full items-center">
        {footerRailItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            onClick={(e) => {
              if (item.href === "#") {
                e.preventDefault();
              }
            }}
            className="flex h-[52px] w-[52px] flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] text-[10.5px] font-medium text-[var(--ink-faint)] hover:bg-[var(--bg-2)] hover:text-[var(--ink-soft)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {item.icon({ className: "h-[18px] w-[18px]" })}
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </aside>
  );
}
