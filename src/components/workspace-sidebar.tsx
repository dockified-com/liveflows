"use client";

import { OrganizationSwitcher, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

export interface WorkspaceSidebarProps {
  workspaceSlug?: string;
  workspaceName?: string;
  recents?: Array<{ id: string; name: string; href: string }>;
  starred?: Array<{ id: string; name: string; href: string }>;
  onItemClick?: () => void;
}

export function WorkspaceSidebar({
  workspaceSlug = "acme-eng",
  workspaceName,
  recents = [],
  starred = [],
  onItemClick,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const isProjectRoute = pathname.includes("/p/");
  const activeWorkspaceSlug = workspaceSlug || "acme-eng";
  const displayName = workspaceName || activeWorkspaceSlug;

  return (
    <aside
      aria-label="Workspace Sidebar"
      className="flex w-[240px] flex-col border-r border-[var(--line)] bg-[var(--card)] p-3.5 shrink-0 h-full select-none"
    >
      {/* Workspace Switcher / Header */}
      <div className="mb-4">
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/w/:slug"
          afterLeaveOrganizationUrl="/session-tasks/choose-organization"
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] p-2 hover:bg-[var(--bg-2)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
              organizationPreviewAvatarBox:
                "h-7 w-7 rounded-[7px] bg-[var(--accent)] text-white font-semibold text-xs flex items-center justify-center shrink-0",
              organizationPreviewTextContainer:
                "flex flex-col text-left overflow-hidden",
              organizationPreviewMainIdentifier:
                "font-semibold text-[13.5px] text-[var(--ink)] truncate",
              organizationSwitcherTriggerIcon:
                "ml-auto text-[var(--ink-faint)] text-[11px]",
            },
          }}
        />
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <div className="px-2 my-2 text-[11px] font-semibold text-[var(--ink-faint)] uppercase tracking-wider">
          Workspace
        </div>

        <Link
          href={`/w/${activeWorkspaceSlug}`}
          onClick={onItemClick}
          className={`flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
            pathname === `/w/${activeWorkspaceSlug}`
              ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
              : "text-[var(--ink-soft)] hover:bg-[var(--bg-2)]"
          }`}
        >
          <Icon size={16} className="text-[var(--ink-faint)]">
            <path d="M3 4h18v4H3V4zm0 7h18v4H3v-4zm0 7h18v4H3v-4z" />
          </Icon>
          <span>All projects</span>
        </Link>

        <Link
          href={`/w/${activeWorkspaceSlug}#starred`}
          onClick={onItemClick}
          className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-[13.5px] text-[var(--ink-soft)] hover:bg-[var(--bg-2)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <Icon size={16} className="text-[var(--ink-faint)]">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </Icon>
          <span>Starred</span>
        </Link>

        <Link
          href={`/w/${activeWorkspaceSlug}#members`}
          onClick={onItemClick}
          className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-[13.5px] text-[var(--ink-soft)] hover:bg-[var(--bg-2)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <Icon size={16} className="text-[var(--ink-faint)]">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </Icon>
          <span>Members</span>
        </Link>

        {/* Recent Items Section */}
        {recents.length > 0 && (
          <>
            <div className="px-2 pt-3 pb-1 text-[11px] font-semibold text-[var(--ink-faint)] uppercase tracking-wider">
              Recent
            </div>
            {recents.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={onItemClick}
                className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13.5px] text-[var(--ink-soft)] hover:bg-[var(--bg-2)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] truncate"
              >
                <Icon size={14} className="text-[var(--ink-faint)] shrink-0">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </Icon>
                <span className="truncate">{item.name}</span>
              </Link>
            ))}
          </>
        )}
      </div>

      {/* User Footer */}
      <div className="mt-auto border-t border-[var(--line)] pt-3 flex items-center gap-2.5 px-2">
        <UserButton
          appearance={{
            elements: {
              avatarBox:
                "h-[30px] w-[30px] rounded-full border border-[var(--line)]",
            },
          }}
        />
        <div className="flex flex-col overflow-hidden text-left">
          <span className="text-[13px] font-medium text-[var(--ink)] truncate">
            {user?.fullName || user?.firstName || "User"}
          </span>
          <span className="text-[11px] text-[var(--ink-faint)] truncate">
            {user?.primaryEmailAddress?.emailAddress || "Member"}
          </span>
        </div>
      </div>
    </aside>
  );
}
