import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRail } from "@/components/app-rail";
import { AppShell } from "@/components/app-shell";
import { MobileDrawer } from "@/components/mobile-drawer";
import { Topbar } from "@/components/topbar";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";

// Mock @clerk/nextjs
vi.mock("@clerk/nextjs", () => ({
  OrganizationSwitcher: () => <div data-testid="org-switcher" />,
  UserButton: () => <div data-testid="user-button" />,
  useUser: () => ({
    user: {
      fullName: "Dara K.",
      primaryEmailAddress: { emailAddress: "dara@example.com" },
    },
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/w/acme-eng",
}));

describe("Application Shell Components", () => {
  beforeEach(() => {
    cleanup();
  });

  describe("AppRail", () => {
    it("renders the logo badge and navigation items", () => {
      render(<AppRail />);
      expect(screen.getByText("LF")).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Projects")).toBeInTheDocument();
      expect(screen.getByText("Alerts")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("marks active rail items with aria-current", () => {
      render(<AppRail />);
      const projectsLink = screen.getByRole("link", { name: /projects/i });
      expect(projectsLink).toHaveAttribute("aria-current", "page");
    });
  });

  describe("WorkspaceSidebar", () => {
    it("renders workspace navigation links and organization switcher", () => {
      render(<WorkspaceSidebar workspaceSlug="acme-eng" />);
      expect(screen.getByTestId("org-switcher")).toBeInTheDocument();
      expect(screen.getByText("All projects")).toBeInTheDocument();
      expect(screen.getByText("Starred")).toBeInTheDocument();
      expect(screen.getByText("Members")).toBeInTheDocument();
    });

    it("renders recent items when provided", () => {
      const recents = [
        { id: "1", name: "Checkout redesign", href: "/w/acme-eng/p/checkout" },
      ];
      render(<WorkspaceSidebar workspaceSlug="acme-eng" recents={recents} />);
      expect(screen.getByText("Recent")).toBeInTheDocument();
      expect(screen.getByText("Checkout redesign")).toBeInTheDocument();
    });
  });

  describe("Topbar", () => {
    it("renders breadcrumb navigation", () => {
      render(
        <Topbar
          breadcrumbs={[
            { label: "Workspace" },
            { label: "acme-eng", bold: true },
          ]}
        />,
      );
      expect(screen.getByText("Workspace")).toBeInTheDocument();
      expect(screen.getByText("acme-eng")).toBeInTheDocument();
    });

    it("calls onMobileMenuToggle when mobile toggle button is clicked", () => {
      const onToggle = vi.fn();
      render(<Topbar onMobileMenuToggle={onToggle} />);
      const btn = screen.getByRole("button", {
        name: /open mobile navigation/i,
      });
      fireEvent.click(btn);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("MobileDrawer", () => {
    it("renders modal dialog when open and responds to Escape key", () => {
      const onClose = vi.fn();
      render(
        <MobileDrawer isOpen={true} onClose={onClose}>
          <p>Drawer Content</p>
        </MobileDrawer>,
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Drawer Content")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not render when closed", () => {
      render(
        <MobileDrawer isOpen={false} onClose={vi.fn()}>
          <p>Drawer Content</p>
        </MobileDrawer>,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("AppShell", () => {
    it("renders rail, sidebar, topbar, and main content", () => {
      render(
        <AppShell>
          <div data-testid="page-content">Hello Shell</div>
        </AppShell>,
      );
      expect(screen.getByTestId("page-content")).toBeInTheDocument();
      expect(screen.getByRole("main")).toHaveTextContent("Hello Shell");
    });
  });
});
