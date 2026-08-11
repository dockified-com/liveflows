import { cleanup, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mock functions must be created via vi.hoisted() so they are available
// inside the hoisted vi.mock factories. ---

const { _status, _storageElements } = vi.hoisted(() => ({
  _status: { value: "connected" as string },
  _storageElements: { value: [] as unknown[] },
}));

vi.mock("@liveblocks/client", () => {
  const LiveMap = vi.fn();
  const LiveObject = vi.fn();
  return {
    createClient: vi.fn(() => ({})),
    LiveMap,
    LiveObject,
  };
});

vi.mock("@liveblocks/react", () => ({
  createRoomContext: vi.fn(() => ({
    RoomProvider: ({ children }: { children: React.ReactNode }) => children,
    useMutation: vi.fn(() => vi.fn()),
    useStorage: vi.fn((selector: (root: unknown) => unknown) => {
      if (typeof selector === "function") {
        return selector({
          elements: {
            entries: () =>
              _storageElements.value.map((el, i) => [
                String(i),
                { toImmutable: () => el },
              ]),
          },
        });
      }
      return _storageElements.value;
    }),
    useOthers: vi.fn(() => []),
    useStatus: vi.fn(() => _status.value),
  })),
}));

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
    _storageElements.value = [];
  });

  it("renders the outage banner when status is disconnected", () => {
    _status.value = "disconnected";
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    const banner = container.querySelector('[data-testid="outage-banner"]');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      "Liveblocks is unreachable. The canvas is in read-only mode.",
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
    _storageElements.value = new Array(3000).fill({ id: "1" });
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    expect(
      container.querySelector('[data-testid="storage-warning"]'),
    ).not.toBeInTheDocument();
  });

  it("renders storage warning when elementCount > 3000", () => {
    _storageElements.value = new Array(3001).fill({ id: "1" });
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    const warning = container.querySelector('[data-testid="storage-warning"]');
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveAttribute("data-severity", "warning");
    expect(warning).toHaveTextContent(
      "Warning: Canvas is getting large. Consider starting a new project soon.",
    );
  });

  it("renders critical storage warning when elementCount > 5000", () => {
    _storageElements.value = new Array(5001).fill({ id: "1" });
    const { container } = render(
      <CanvasRoom roomId="test-room" fallbackElements={[]} />,
    );
    const warning = container.querySelector('[data-testid="storage-warning"]');
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveAttribute("data-severity", "critical");
    expect(warning).toHaveTextContent(
      "Warning: Canvas is getting large. Consider starting a new project soon.",
    );
  });
});
