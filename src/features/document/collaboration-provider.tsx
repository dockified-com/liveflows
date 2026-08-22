"use client";

import Collaboration from "@tiptap/extension-collaboration";
import type { Extension } from "@tiptap/react";
import type React from "react";
import { useMemo } from "react";
import * as Y from "yjs";
import {
  CollabRoomProvider,
  useCollab,
} from "@/features/collaboration/collab-provider";

/**
 * THE SEAM.
 *
 * This is the only module in the codebase that knows which collaboration vendor
 * is in use. Ported from Liveblocks to Hocuspocus/Yjs.
 *
 * Zero @liveblocks/* imports.
 */

export function RoomProvider({
  id,
  children,
}: {
  id: string;
  initialPresence?: unknown;
  initialStorage?: unknown;
  children: React.ReactNode;
}) {
  return <CollabRoomProvider roomId={id}>{children}</CollabRoomProvider>;
}

/** Normalized status. Deliberately NOT the vendor's own strings, so the
 *  autosave banner survives a provider swap untouched. */
export type ProviderStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

/**
 * True when the provider ships its own undo manager.
 *
 * Read by extensions/index.ts to decide whether to disable StarterKit's
 * history.
 */
export const PROVIDER_MANAGES_HISTORY = true;

export function useCollaborationExtension(_roomId: string): Extension {
  const { doc } = useCollab();

  // Create or reuse fallback doc if not inside provider context
  const targetDoc = useMemo(() => doc ?? new Y.Doc(), [doc]);

  return Collaboration.configure({
    document: targetDoc,
    field: "default",
  }) as unknown as Extension;
}

export function useProviderStatus(): ProviderStatus {
  const { status } = useCollab();

  switch (status) {
    case "connected":
      return "connected";
    case "connecting":
    case "reconnecting":
      return "connecting";
    case "disconnected":
      return "disconnected";
    default:
      return "failed";
  }
}
