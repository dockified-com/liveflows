"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { AppRail } from "@/components/app-rail";
import { MobileDrawer } from "@/components/mobile-drawer";
import { Topbar } from "@/components/topbar";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Extract route parameters if present to build breadcrumbs
  const pathSegments = pathname.split("/").filter(Boolean);
  const workspaceSlug = pathSegments[0] === "w" ? pathSegments[1] : "acme-eng";
  const projectSlug = pathSegments[2] === "p" ? pathSegments[3] : undefined;

  const breadcrumbs = [
    { label: "Workspace", href: "/" },
    {
      label: workspaceSlug || "acme-eng",
      href: `/w/${workspaceSlug || "acme-eng"}`,
      bold: !projectSlug,
    },
  ];

  if (projectSlug) {
    breadcrumbs.push({
      label: projectSlug,
      href: `/w/${workspaceSlug}/p/${projectSlug}`,
      bold: true,
    });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)] font-sans">
      {/* Desktop 72px Rail (hidden on mobile < 768px) */}
      <div className="hidden md:flex shrink-0">
        <AppRail />
      </div>

      {/* Desktop 240px Sidebar (hidden on mobile < 768px) */}
      <div className="hidden md:flex shrink-0">
        <WorkspaceSidebar workspaceSlug={workspaceSlug} />
      </div>

      {/* Mobile Drawer (visible when mobileDrawerOpen is true on mobile < 768px) */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      >
        <WorkspaceSidebar
          workspaceSlug={workspaceSlug}
          onItemClick={() => setMobileDrawerOpen(false)}
        />
      </MobileDrawer>

      {/* Main Content Area (Topbar + Content) */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar
          breadcrumbs={breadcrumbs}
          onMobileMenuToggle={() => setMobileDrawerOpen(true)}
        />
        <main
          aria-label="Main content"
          className="flex-1 overflow-auto bg-[var(--bg)]"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
