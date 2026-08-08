import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui";
import { AppNav } from "./app-nav";

// Mock @clerk/nextjs — we test that OUR component renders the right structure,
// not that Clerk works. These mocks are thin passthroughs.
vi.mock("@clerk/nextjs", () => ({
  OrganizationSwitcher: () => <div data-testid="org-switcher" />,
  UserButton: () => <div data-testid="user-button" />,
  Show: ({ when, children }: { when: string; children: React.ReactNode }) => (
    <div data-testid={`show-${when}`}>{children}</div>
  ),
  SignInButton: () => (
    <button type="button" data-testid="sign-in-button">
      Sign in
    </button>
  ),
}));

describe("AppNav", () => {
  beforeEach(() => {
    cleanup();
    useUiStore.setState({ sidebarOpen: true, modal: null });
  });

  it("renders a banner header with main navigation", () => {
    render(<AppNav />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /main navigation/i }),
    ).toBeInTheDocument();
  });

  it("renders the org switcher", () => {
    render(<AppNav />);
    expect(screen.getByTestId("org-switcher")).toBeInTheDocument();
  });

  it("has an accessible sidebar toggle button", () => {
    render(<AppNav />);
    const btn = screen.getByRole("button", { name: /close sidebar/i });
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles sidebar state on button click", () => {
    render(<AppNav />);
    const btn = screen.getByRole("button", { name: /close sidebar/i });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-label", "Open sidebar");
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("renders sign-in and user button areas", () => {
    render(<AppNav />);
    expect(screen.getByTestId("show-signed-out")).toBeInTheDocument();
    expect(screen.getByTestId("show-signed-in")).toBeInTheDocument();
  });
});
