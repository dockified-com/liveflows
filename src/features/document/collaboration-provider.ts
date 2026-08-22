"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import type { Extension } from "@tiptap/react";

/**
 * THE SEAM.
 *
 * This is the only module in the codebase that knows which collaboration vendor
 * is in use. The Hocuspocus/Yjs migration rewrites the bodies below and no other
 * file changes — see docs/features/realtime-collaboration/design.md.
 *
 * Do not import @liveblocks/* anywhere else under src/features/document/.
 */

const client = createClient({ authEndpoint: "/api/liveblocks-auth" });

const { RoomProvider, useStatus } = createRoomContext(client);

export { RoomProvider };

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
 * history. Expressed as an exported value rather than a hardcoded false in the
 * extension list, so it stays correct when the provider changes — and so it
 * does not read as deletable dead config.
 */
export const PROVIDER_MANAGES_HISTORY = true;

export function useCollaborationExtension(_roomId: string): Extension {
  // Liveblocks resolves the room from the surrounding RoomProvider, so roomId
  // is unused here. Hocuspocus will need it — keep the parameter.
  return useLiveblocksExtension() as unknown as Extension;
}

export function useProviderStatus(): ProviderStatus {
  const status = useStatus();

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
