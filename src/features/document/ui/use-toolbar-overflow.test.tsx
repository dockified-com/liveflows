import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToolbarOverflow } from "./use-toolbar-overflow";

describe("useToolbarOverflow", () => {
  let callbacks: Array<
    (entries: Array<{ contentRect: { width: number } }>) => void
  > = [];
  let disconnectSpy = vi.fn();
  let observeSpy = vi.fn();
  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    callbacks = [];
    disconnectSpy = vi.fn();
    observeSpy = vi.fn();

    globalThis.ResizeObserver = class {
      constructor(
        cb: (entries: Array<{ contentRect: { width: number } }>) => void,
      ) {
        callbacks.push(cb);
      }
      observe = observeSpy;
      unobserve = vi.fn();
      disconnect = disconnectSpy;
    } as never;
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it("returns all items visible when ResizeObserver is undefined", () => {
    // @ts-expect-error test undefined ResizeObserver
    delete globalThis.ResizeObserver;

    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useToolbarOverflow(ref));

    expect(result.current.visibleCount).toBe(Infinity);
  });

  it("returns a reduced count for a narrow container", () => {
    const div = document.createElement("div");
    const ref = { current: div };
    const { result } = renderHook(() =>
      useToolbarOverflow(ref, {
        totalItems: 14,
        itemWidth: 32,
        reserveWidth: 40,
      }),
    );

    act(() => {
      callbacks[0]?.([{ contentRect: { width: 300 } }]);
    });

    expect(result.current.visibleCount).toBe(8);
  });

  it("recomputes on resize", () => {
    const div = document.createElement("div");
    const ref = { current: div };
    const { result } = renderHook(() =>
      useToolbarOverflow(ref, {
        totalItems: 14,
        itemWidth: 32,
        reserveWidth: 40,
      }),
    );

    act(() => {
      callbacks[0]?.([{ contentRect: { width: 300 } }]);
    });
    expect(result.current.visibleCount).toBe(8);

    act(() => {
      callbacks[0]?.([{ contentRect: { width: 600 } }]);
    });
    expect(result.current.visibleCount).toBe(14);
  });

  it("cleans up the observer on unmount", () => {
    const div = document.createElement("div");
    const ref = { current: div };
    const { unmount } = renderHook(() => useToolbarOverflow(ref));

    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
