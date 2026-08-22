/**
 * @vitest-environment jsdom
 */
import { cleanup, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mock functions must be created via vi.hoisted() so they are available
// inside the hoisted vi.mock factories. ---

const { _status, _elements } = vi.hoisted(() => ({
  _status: { value: "connected" as string },
  _elements: { value: [] as unknown[] },
}));

vi.mock("@/features/collaboration/collab-provider", () => {
  return {
    CollabRoomProvider: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    useCollab: () => {
      const doc = new (require("yjs").Doc)();
      const map = doc.getMap("elements");
      for (let i = 0; i < _elements.value.length; i++) {
        map.set(`el_${i}`, _elements.value[i]);
      }
      return {
        doc,
        status: _status.value,
        others: [],
        provider: null,
      };
    },
  };
});

// Mock dynamic Excalidraw import — returns a simple div that exposes viewModeEnabled
vi.mock("next/dynamic", () => ({
  default: () => {
    const MockExcalidraw = (props: Record<string, unknown>) => (
      <div
        data-testid="excalidraw"
        data-view-mode={String(props.viewModeEnabled ?? false)}
      />
    );
    return MockExcalidraw;
  },
}));

import { CanvasRoom } from "./canvas-room";

describe("CanvasRoom fallback", () => {
  beforeEach(() => {
    cleanup();
    _status.value = "connected";
    _elements.value = [];
  });

  it("renders the outage banner when status is disconnected", () => {
    _status.value = "disconnected";
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    const banner = container.querySelector('[data-testid="outage-banner"]');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      "Collaboration server is unreachable. Rendering read-only snapshot.",
    );
  });

  it("passes viewModeEnabled=true to Excalidraw when disconnected", () => {
    _status.value = "disconnected";
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    const excalidraw = container.querySelector('[data-testid="excalidraw"]');
    expect(excalidraw).toHaveAttribute("data-view-mode", "true");
  });

  it("does not render the banner when status is connected", () => {
    _status.value = "connected";
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    expect(
      container.querySelector('[data-testid="outage-banner"]'),
    ).not.toBeInTheDocument();
  });

  it("passes viewModeEnabled=false to Excalidraw when connected", () => {
    _status.value = "connected";
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    const excalidraw = container.querySelector('[data-testid="excalidraw"]');
    expect(excalidraw).toHaveAttribute("data-view-mode", "false");
  });

  it("does not render storage warning when elementCount <= 3000", () => {
    _elements.value = new Array(3000).fill({ id: "1" });
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    expect(
      container.querySelector('[data-testid="storage-warning"]'),
    ).not.toBeInTheDocument();
  });

  it("renders storage warning when elementCount > 3000", () => {
    _elements.value = new Array(3001).fill({ id: "1" });
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    const warning = container.querySelector('[data-testid="storage-warning"]');
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveAttribute("data-severity", "warning");
    expect(warning).toHaveTextContent("Large Canvas");
  });

  it("renders critical storage warning when elementCount > 5000", () => {
    _elements.value = new Array(5001).fill({ id: "1" });
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    const warning = container.querySelector('[data-testid="storage-warning"]');
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveAttribute("data-severity", "critical");
    expect(warning).toHaveTextContent("Critical Size");
  });
});
