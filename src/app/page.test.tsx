import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ isAuthenticated: false, orgSlug: null })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

describe("Home", () => {
  it("shows a concrete canvas preview instead of an empty black placeholder", async () => {
    render(await Home());

    expect(
      screen.queryByText("[ Interactive Canvas Demo ]"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("API Gateway")).toBeInTheDocument();
    expect(screen.getByText("Liveblocks Room")).toBeInTheDocument();
    expect(screen.getByText("Postgres Mirror")).toBeInTheDocument();
  });
});
