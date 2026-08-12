"use client";

import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { createClient, LiveMap, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { useUiStore } from "@/stores/ui";
import { collectLocalChanges, mergeIncoming } from "./element-sync";

// --- Liveblocks client & room context ---

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

/**
 * Frozen storage shape (shared with the server side):
 *   { elements: LiveMap<string, LiveObject<ExcalidrawElement>>, meta: LiveObject<{ viewBackgroundColor: string }> }
 */
const { RoomProvider, useMutation, useStorage, useOthers, useStatus } =
  createRoomContext(client);

// --- Dynamic Excalidraw import ---

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[var(--surface)] text-xs text-[var(--ink-tertiary)]">
        Loading canvas…
      </div>
    ),
  },
);

const CAPTURE_NEVER = "NEVER" as const;
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
  const latestSceneRef = useRef<readonly ExcalidrawElement[] | null>(null);
  const status = useStatus();
  const others = useOthers();
  const setElementCount = useUiStore((s) => s.setElementCount);

  // Read elements from Liveblocks storage
  // biome-ignore lint/suspicious/noExplicitAny: Liveblocks loose storage typing
  const remoteElements = useStorage((root: any) => {
    const map = root.elements;
    if (!map) return null;
    const result: ExcalidrawElement[] = [];

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

  const applyRemote = useCallback(
    (incoming: ExcalidrawElement[]) => {
      if (!api) return;
      const local =
        api.getSceneElementsIncludingDeleted() as ExcalidrawElement[];
      const merged = mergeIncoming(local, incoming);
      for (const el of merged) ledger.current.set(el.id, el.version);
      api.updateScene({
        elements: merged,
        captureUpdate: CAPTURE_NEVER,
        // biome-ignore lint/suspicious/noExplicitAny: captureUpdate not in Excalidraw types
      } as any);
    },
    [api],
  );

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

  useEffect(() => {
    if (!api || !fallbackElements || fallbackElements.length === 0) return;
    if (remoteElements && remoteElements.length > 0) return;
    api.updateScene({
      elements: fallbackElements as ExcalidrawElement[],
      captureUpdate: CAPTURE_NEVER,
      // biome-ignore lint/suspicious/noExplicitAny: captureUpdate not in Excalidraw types
    } as any);
  }, [api, fallbackElements, remoteElements]);

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

  // Trailing flush scheduler (D36)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushLatest = useCallback(() => {
    if (!latestSceneRef.current) return;
    const changed = collectLocalChanges(
      latestSceneRef.current,
      ledger.current,
    );
    if (changed.length > 0) {
      for (const el of changed) ledger.current.set(el.id, el.version);
      push(changed);
    }
  }, [push]);

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      latestSceneRef.current = elements;
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        flushLatest();
      }, THROTTLE_MS);
    },
    [flushLatest],
  );

  // Unmount flush boundary (D15/D27)
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      flushLatest();
    };
  }, [flushLatest]);

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
      {/* Light SaaS Chrome Header */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)]/90 px-3 py-1.5 backdrop-blur-xs shadow-xs text-xs font-sans select-none">
        <StatusPill
          status={
            status === "connected"
              ? "synced"
              : status === "reconnecting"
                ? "reconnecting"
                : "disconnected"
          }
          label={
            status === "connected"
              ? "Live"
              : status === "reconnecting"
                ? "Connecting..."
                : "Offline"
          }
        />

        <div className="h-3 w-px bg-[var(--border)]" />

        <span className="text-[var(--ink-secondary)]">
          Collaborators: <strong className="text-[var(--ink)]">{others.length}</strong>
        </span>

        {elementCount > 3000 && (
          <span
            data-testid="storage-warning"
            data-severity={elementCount > 5000 ? "critical" : "warning"}
            className={`rounded px-1.5 py-0.5 font-medium ${
              elementCount > 5000
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {elementCount > 5000 ? "Critical Size" : "Large Canvas"}
          </span>
        )}
      </div>

      {status === "disconnected" && (
        <div
          data-testid="outage-banner"
          className="absolute top-0 inset-x-0 z-30 flex items-center justify-center bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-md"
        >
          Liveblocks is unreachable. Rendering read-only snapshot.
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
