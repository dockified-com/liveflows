import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "./layout";

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">
      <main>{children}</main>
    </div>
  ),
}));

describe("AppLayout", () => {
  it("renders AppShell and main content", () => {
    render(
      <AppLayout>
        <p>Test content</p>
      </AppLayout>,
    );
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Test content");
  });
});
