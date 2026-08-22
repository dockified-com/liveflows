import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import type { ProviderStatus } from "../collaboration-provider";
import { SaveStatus } from "./save-status";

describe("SaveStatus", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders 'Saving…' when status is connecting", () => {
    render(<SaveStatus status="connecting" />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("renders 'Saved' when status is connected", () => {
    render(<SaveStatus status="connected" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("renders 'Connection lost' when status is disconnected", () => {
    render(<SaveStatus status="disconnected" />);
    expect(screen.getByText("Connection lost")).toBeInTheDocument();
  });

  it("renders 'Connection lost' when status is failed", () => {
    render(<SaveStatus status="failed" />);
    expect(screen.getByText("Connection lost")).toBeInTheDocument();
  });

  it("renders 'Read-only' when readOnly prop is true regardless of connection status", () => {
    const statuses: ProviderStatus[] = [
      "connecting",
      "connected",
      "disconnected",
      "failed",
    ];

    for (const status of statuses) {
      const { unmount } = render(
        <SaveStatus status={status} readOnly={true} />,
      );
      expect(screen.getByText("Read-only")).toBeInTheDocument();
      unmount();
    }
  });

  it("has aria-live='polite' on container for ambient announcements", () => {
    const { container } = render(<SaveStatus status="connected" />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it("passes axe accessibility checks with no violations", async () => {
    const { container } = render(<SaveStatus status="connected" />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("passes axe checks in read-only and disconnected states", async () => {
    const { container: readOnlyContainer } = render(
      <SaveStatus status="connected" readOnly={true} />,
    );
    const readOnlyResults = await axe(readOnlyContainer);
    expect(readOnlyResults.violations).toEqual([]);

    cleanup();

    const { container: disconnectedContainer } = render(
      <SaveStatus status="disconnected" />,
    );
    const disconnectedResults = await axe(disconnectedContainer);
    expect(disconnectedResults.violations).toEqual([]);
  });
});
