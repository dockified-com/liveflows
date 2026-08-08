import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "./layout";

vi.mock("@/components/app-nav", () => ({
  AppNav: () => <header data-testid="app-nav">Nav</header>,
}));

describe("AppLayout", () => {
  it("renders AppNav and a main landmark containing children", () => {
    render(
      <AppLayout>
        <p>Test content</p>
      </AppLayout>,
    );
    expect(screen.getByTestId("app-nav")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Test content");
  });

  it("uses flex layout for full-height shell", () => {
    const { container } = render(
      <AppLayout>
        <p>Content</p>
      </AppLayout>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("flex");
    expect(wrapper.className).toContain("h-full");
    expect(wrapper.className).toContain("flex-col");
  });
});
