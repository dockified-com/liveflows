"use client";

import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CollabRoomProvider,
  useCollab,
} from "@/features/collaboration/collab-provider";
import { PaneHeader } from "@/features/project-workspace/pane-header";
import { useUiStore } from "@/stores/ui";
import { collectLocalChanges, mergeIncoming } from "./element-sync";

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

  const { doc, status, others } = useCollab();
  const setElementCount = useUiStore((s) => s.setElementCount);

  // Y.Map for canvas elements
  const elementsMap = useMemo(() => {
    return doc ? doc.getMap<ExcalidrawElement>("elements") : null;
  }, [doc]);

  // State of remote elements read from Y.Map
  const [remoteElements, setRemoteElements] = useState<
    ExcalidrawElement[] | null
  >(null);

  // Observe Y.Map changes
  useEffect(() => {
    if (!elementsMap) return;

    const updateFromMap = () => {
      const els = Array.from(elementsMap.values());
      setRemoteElements(els);
    };

    // Initial read
    updateFromMap();

    elementsMap.observe(updateFromMap);
    return () => {
      elementsMap.unobserve(updateFromMap);
    };
  }, [elementsMap]);

  const elementCount = remoteElements?.length ?? fallbackElements?.length ?? 0;

  useEffect(() => {
    setElementCount(elementCount);
  }, [elementCount, setElementCount]);

  // Push local changes into Y.Map storage
  const push = useCallback(
    (changed: ExcalidrawElement[]) => {
      if (!elementsMap || !doc) return;
      doc.transact(() => {
        for (const el of changed) {
          elementsMap.set(el.id, el);
        }
      });
    },
    [elementsMap, doc],
  );

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
    const incoming = remoteElements;
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

  // Trailing flush scheduler
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushLatest = useCallback(() => {
    if (!latestSceneRef.current || remoteElements === null) return;
    const changed = collectLocalChanges(latestSceneRef.current, ledger.current);
    if (changed.length > 0) {
      try {
        for (const el of changed) ledger.current.set(el.id, el.version);
        push(changed);
      } catch (err) {
        console.warn(
          "Failed to push storage mutation (storage loading/disconnected):",
          err,
        );
      }
    }
  }, [push, remoteElements]);

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      latestSceneRef.current = elements;
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => {
        timer.current = null;
        flushLatest();
      }, THROTTLE_MS);
    },
    [flushLatest],
  );

  // Unmount flush boundary
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

  const mappedConnectionStatus =
    status === "connected"
      ? "connected"
      : status === "reconnecting"
        ? "reconnecting"
        : status === "disconnected"
          ? "offline"
          : "loading";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <PaneHeader fileType="canvas" connectionStatus={mappedConnectionStatus} />
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {/* Light SaaS Chrome Overlay */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)]/90 px-3 py-1.5 backdrop-blur-xs shadow-xs text-xs font-sans select-none">
          <StatusPill
            status={
              status === "connected"
                ? "synced"
                : status === "reconnecting" || status === "connecting"
                  ? "reconnecting"
                  : "disconnected"
            }
            label={
              status === "connected"
                ? "Live"
                : status === "reconnecting" || status === "connecting"
                  ? "Connecting..."
                  : "Offline"
            }
          />

          <div className="h-3 w-px bg-[var(--border)]" />

          <span className="text-[var(--ink-secondary)]">
            Collaborators:{" "}
            <strong className="text-[var(--ink)]">{others.length}</strong>
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
            Collaboration server is unreachable. Rendering read-only snapshot.
          </div>
        )}

        <Excalidraw
          excalidrawAPI={(instance) => setApi(instance)}
          onChange={onChange}
          viewModeEnabled={status === "disconnected"}
        />
      </div>
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
    <CollabRoomProvider roomId={roomId}>
      <Canvas fallbackElements={fallbackElements} />
    </CollabRoomProvider>
  );
}
