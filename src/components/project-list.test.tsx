import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui";
import { ProjectList } from "./project-list";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockProjects = [
  { id: "p1", name: "Auth Flow", updatedAt: new Date("2026-08-01") },
  { id: "p2", name: "Data Pipeline", updatedAt: new Date("2026-08-05") },
];

describe("ProjectList", () => {
  beforeEach(() => {
    cleanup();
    useUiStore.setState({ sidebarOpen: true, modal: null });
  });

  it("renders a heading and list of projects", () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />);
    expect(
      screen.getByRole("heading", { name: /system diagrams & architectures/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders project links with correct hrefs", () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />);
    const link = screen.getByRole("link", { name: /auth flow/i });
    expect(link).toHaveAttribute("href", "/w/acme/p/p1");
  });

  it("shows empty state when no projects", () => {
    render(<ProjectList projects={[]} workspaceSlug="acme" />);
    expect(
      screen.getByText(/no active diagram rooms in this workspace/i),
    ).toBeInTheDocument();
  });

  it("opens create-project modal on button click", () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />);
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));
    expect(useUiStore.getState().modal).toEqual({ kind: "create-project" });
  });
});
