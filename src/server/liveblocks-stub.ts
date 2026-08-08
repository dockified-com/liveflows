/**
 * STUB: Awaiting Delta D1 — real implementation in src/server/liveblocks.ts
 * Every function throws. Never returns fake data.
 * Delete this file in the same commit that adds the real liveblocks.ts.
 */

export function provisionRoom(_args: {
  roomId: string;
  workspaceId: string;
  clerkOrgId: string;
}): Promise<void> {
  throw new Error("STUB: awaiting Delta D1 — provisionRoom not implemented");
}

export function decommissionRoom(_roomId: string): Promise<void> {
  throw new Error("STUB: awaiting Delta D1 — decommissionRoom not implemented");
}

export function roomIdForProject(_projectId: string): string {
  throw new Error("STUB: awaiting Delta D1 — roomIdForProject not implemented");
}
