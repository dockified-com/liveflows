import { Liveblocks } from "@liveblocks/node";

if (!process.env.LIVEBLOCKS_SECRET_KEY) {
  throw new Error("LIVEBLOCKS_SECRET_KEY is not set");
}

export const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY,
});

/**
 * Deterministic room ID from file ID.
 * Convention: `file_${fileId}`
 */
export function roomIdForFile(fileId: string): string {
  return `file_${fileId}`;
}

/**
 * Creates the Liveblocks room and optionally seeds empty Storage.
 * Throws on failure so the caller (DAL createFile) can roll back the File row.
 *
 * - defaultAccesses: [] means deny by default
 * - groupsAccesses grants workspace-level write via the group id
 * - organizationId is IMMUTABLE after room creation (hard tenant isolation)
 */
export async function provisionRoom(args: {
  roomId: string;
  workspaceId: string;
  clerkOrgId: string;
  type: "canvas" | "document";
}): Promise<void> {
  const { roomId, workspaceId, clerkOrgId, type } = args;

  await liveblocks.createRoom(roomId, {
    defaultAccesses: [],
    groupsAccesses: { [workspaceId]: ["*:write"] },
    organizationId: clerkOrgId,
  });

  if (type === "canvas") {
    await liveblocks.initializeStorageDocument(roomId, {
      liveblocksType: "LiveObject",
      data: {
        elements: {
          liveblocksType: "LiveMap",
          data: {},
        },
        meta: {
          liveblocksType: "LiveObject",
          data: {
            viewBackgroundColor: "#ffffff",
          },
        },
      },
    });
  }
}

/**
 * Best-effort room deletion. Logs and resolves on failure — NEVER blocks a delete.
 * Orphan rooms cost plan limits but a stuck deletion is worse.
 */
export async function decommissionRoom(roomId: string): Promise<void> {
  try {
    await liveblocks.deleteRoom(roomId);
  } catch (error) {
    console.warn(
      `[liveblocks] Failed to delete room ${roomId}. Orphan room may need manual cleanup.`,
      error,
    );
  }
}
