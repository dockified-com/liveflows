"use client";

import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { createClient, LiveMap, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUiStore } from "@/stores/ui";
import { collectLocalChanges, mergeIncoming } from "./element-sync";

// --- Liveblocks client & room context ---

const client = createClient({
  // The production auth endpoint. It issues a Liveblocks ID token carrying the
  // user's id, the workspace id as a group, and the Clerk org id. Room access
  // is then resolved by Liveblocks against the room's own groupsAccesses, which
  // provisionRoom sets to { [workspaceId]: ["*:write"] }.
  //
  // Pointing this at the spike endpoint under /spike/api/ yields websocket
  // close code 4001 "You have no access to this room", because that path is
  // not the route that grants workspace group access.
  authEndpoint: "/api/liveblocks-auth",
});

/**
 * Frozen storage shape (shared with the server side):
 *   { elements: LiveMap<string, LiveObject<ExcalidrawElement>>, meta: LiveObject<{ viewBackgroundColor: string }> }
 */
const { RoomProvider, useMutation, useStorage, useOthers, useStatus } =
  createRoomContext(client);

// --- Dynamic Excalidraw import (SSR-unsafe: touches window at module scope) ---

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false, loading: () => <p>Loading canvas…</p> },
);

// CaptureUpdateAction.NEVER — imported as string to avoid SSR module-scope crash
const CAPTURE_NEVER = "NEVER" as const;

// --- Throttle interval for onChange (ms) ---
const THROTTLE_MS = 100;

// --- Inner Canvas component ---

function Canvas({
  fallbackElements,
}: {
  fallbackElements?: readonly ExcalidrawElement[];
}) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const ledger = useRef(new Map<string, number>());
  const pointerDown = useRef(false);
  const pending = useRef<ExcalidrawElement[] | null>(null);
  const status = useStatus();
  const others = useOthers();
  const setElementCount = useUiStore((s) => s.setElementCount);

  // Read elements from Liveblocks storage as a plain array snapshot
  // biome-ignore lint/suspicious/noExplicitAny: Liveblocks loose storage typing
  const remoteElements = useStorage((root: any) => {
    const map = root.elements;
    if (!map) return null;
    const result: ExcalidrawElement[] = [];

    // Support both ES6 Maps (from LiveMap) and plain objects (from legacy rooms)
    if (typeof map.entries === "function") {
      for (const [, liveObj] of map.entries()) {
        result.push(liveObj.toImmutable ? liveObj.toImmutable() : liveObj);
      }
    } else {
      for (const liveObj of Object.values(map)) {
        result.push(
          (liveObj as any).toImmutable
            ? (liveObj as any).toImmutable()
            : liveObj,
        );
      }
    }
    return result;
  });

  const elementCount = remoteElements?.length ?? fallbackElements?.length ?? 0;

  useEffect(() => {
    setElementCount(elementCount);
  }, [elementCount, setElementCount]);

  // Push local changes into Liveblocks storage
  // biome-ignore lint/suspicious/noExplicitAny: Liveblocks loose storage typing
  const push = useMutation(({ storage }: any, changed: ExcalidrawElement[]) => {
    let map = storage.get("elements");
    if (!map) {
      map = new LiveMap();
      storage.set("elements", map);
    }
    for (const el of changed) {
      const existing = map.get(el.id);
      if (existing) {
        // biome-ignore lint/suspicious/noExplicitAny: LiveObject update typing
        existing.update(el as any);
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: LiveObject constructor typing
        map.set(el.id, new LiveObject(el as any));
      }
    }
  }, []);

  /**
   * Apply remote elements to the scene.
   * CRITICAL: records to ledger BEFORE updateScene so the resulting onChange
   * finds nothing to echo back (echo suppression).
   */
  const applyRemote = useCallback(
    (incoming: ExcalidrawElement[]) => {
      if (!api) return;
      const local =
        api.getSceneElementsIncludingDeleted() as ExcalidrawElement[];
      const merged = mergeIncoming(local, incoming);
      // Record BEFORE applying so the resulting onChange sends nothing back
      for (const el of merged) ledger.current.set(el.id, el.version);
      api.updateScene({
        elements: merged,
        captureUpdate: CAPTURE_NEVER,
        // biome-ignore lint/suspicious/noExplicitAny: captureUpdate not in Excalidraw's public updateScene types
      } as any);
    },
    [api],
  );

  // Apply remote updates, gated by pointer state (mechanic #2)
  useEffect(() => {
    if (!remoteElements || !api) return;
    const incoming = remoteElements as unknown as ExcalidrawElement[];
    if (incoming.length === 0) return;

    if (pointerDown.current) {
      pending.current = incoming;
      return;
    }
    applyRemote(incoming);
  }, [remoteElements, api, applyRemote]);

  // Apply fallback elements on initial load (when no remote elements exist yet)
  useEffect(() => {
    if (!api || !fallbackElements || fallbackElements.length === 0) return;
    if (remoteElements && remoteElements.length > 0) return;
    api.updateScene({
      elements: fallbackElements as ExcalidrawElement[],
      captureUpdate: CAPTURE_NEVER,
      // biome-ignore lint/suspicious/noExplicitAny: captureUpdate not in Excalidraw's public updateScene types
    } as any);
  }, [api, fallbackElements, remoteElements]);

  // Pointer gate: buffer remote updates during drags (mechanic #2)
  useEffect(() => {
    const down = () => {
      pointerDown.current = true;
    };
    const up = () => {
      pointerDown.current = false;
      if (pending.current) {
        applyRemote(pending.current);
        pending.current = null;
      }
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [applyRemote]);

  // Throttled onChange → push local changes (mechanic #1)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        const changed = collectLocalChanges(elements, ledger.current);
        if (changed.length === 0) return;
        for (const el of changed) ledger.current.set(el.id, el.version);
        push(changed);
      }, THROTTLE_MS);
    },
    [push],
  );

  // Expose API for Playwright test handles — inside useEffect, not during render
  useEffect(() => {
    if (api) {
      (
        window as unknown as { __canvasApi?: ExcalidrawImperativeAPI }
      ).__canvasApi = api;
    }
    return () => {
      (
        window as unknown as { __canvasApi?: ExcalidrawImperativeAPI }
      ).__canvasApi = undefined;
    };
  }, [api]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          top: 4,
          left: 4,
          background: "#fff",
          padding: "2px 6px",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>
          <span data-testid="status">{status}</span> · others: {others.length}
        </span>
        {elementCount > 5000 ? (
          <span
            data-testid="storage-warning"
            data-severity="critical"
            style={{
              color: "#b91c1c",
              fontWeight: 600,
              background: "#fee2e2",
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            Warning: Canvas is getting large. Consider starting a new project
            soon.
          </span>
        ) : elementCount > 3000 ? (
          <span
            data-testid="storage-warning"
            data-severity="warning"
            style={{
              color: "#b45309",
              fontWeight: 500,
              background: "#fef3c7",
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            Warning: Canvas is getting large. Consider starting a new project
            soon.
          </span>
        ) : null}
      </div>
      {status === "disconnected" && (
        <div
          data-testid="outage-banner"
          style={{
            position: "fixed",
            zIndex: 100,
            top: 0,
            left: 0,
            right: 0,
            background: "#dc2626",
            color: "#fff",
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Liveblocks is unreachable. The canvas is in read-only mode.
        </div>
      )}
      <Excalidraw
        excalidrawAPI={(instance) => setApi(instance)}
        onChange={onChange}
        viewModeEnabled={status === "disconnected"}
      />
    </div>
  );
}

// --- Exported CanvasRoom component ---

export interface CanvasRoomProps {
  roomId: string;
  fallbackElements?: readonly ExcalidrawElement[];
}

/**
 * CanvasRoom — the collaborative canvas component.
 *
 * Renders a full-viewport Excalidraw canvas connected to a Liveblocks room.
 * Storage shape: { elements: LiveMap, meta: LiveObject<{ viewBackgroundColor }> }
 *
 * Only viewBackgroundColor is shared. Everything else in appState
 * (zoom, scroll, selection) is per-user.
 */
export function CanvasRoom({ roomId, fallbackElements }: CanvasRoomProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null }}
      initialStorage={{
        elements: new LiveMap(),
        meta: new LiveObject({ viewBackgroundColor: "#ffffff" }),
      }}
    >
      <Canvas fallbackElements={fallbackElements} />
    </RoomProvider>
  );
}
