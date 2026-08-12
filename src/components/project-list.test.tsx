import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  { id: "p1", name: "Auth Flow", updatedAt: new Date(Date.now() - 2 * 60_000) },
  {
    id: "p2",
    name: "Data Pipeline",
    updatedAt: new Date(Date.now() - 3 * 3_600_000),
  },
];

describe("ProjectList", () => {
  beforeEach(() => {
    cleanup();
    useUiStore.setState({ sidebarOpen: true, modal: null });
  });

  it("renders a Projects heading with a count of projects", () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />);
    expect(
      screen.getByRole("heading", { name: /^projects$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 projects")).toBeInTheDocument();
  });

  it("renders a card per project plus the new-project card", () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders project names prominently with a relative updated time", () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />);
    expect(
      screen.getByRole("heading", { name: /auth flow/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/updated 2m ago/i)).toBeInTheDocument();
    expect(screen.getByText(/updated 3h ago/i)).toBeInTheDocument();
  });

  it("renders project links with correct hrefs", () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />);
    const link = screen.getByRole("link", { name: /auth flow/i });
    expect(link).toHaveAttribute("href", "/w/acme/p/p1");
  });

  it("opens the create-project modal from the new-project card", () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />);
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));
    expect(useUiStore.getState().modal).toEqual({ kind: "create-project" });
  });

  it("shows a warm empty state with a primary action when no projects", () => {
    render(<ProjectList projects={[]} workspaceSlug="acme" />);
    expect(
      screen.getByRole("heading", { name: /no projects yet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/shared canvases where your team designs/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));
    expect(useUiStore.getState().modal).toEqual({ kind: "create-project" });
  });

  it("shows no realtime status or presence UI on cards", () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />);
    expect(screen.queryByText(/synced/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ready/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/active collaborators/i),
    ).not.toBeInTheDocument();
  });

  it("does not import Liveblocks (Postgres metadata only)", () => {
    const source = readFileSync(resolve(__dirname, "project-list.tsx"), "utf8");
    expect(source).not.toMatch(/liveblocks/i);
  });
});
