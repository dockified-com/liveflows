import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

/**
 * Excalidraw's own rule: higher version wins, lower versionNonce breaks ties.
 * This is the last-write-wins (LWW) merge strategy.
 */
function incomingWins(
  local: ExcalidrawElement,
  incoming: ExcalidrawElement,
): boolean {
  if (incoming.version !== local.version)
    return incoming.version > local.version;
  return incoming.versionNonce < local.versionNonce;
}

/**
 * Merge remote elements into the local scene.
 *
 * Rules:
 * - Never removes elements (soft-delete with isDeleted: true is the only deletion).
 * - Higher version wins; on tie, lower versionNonce wins.
 * - Elements present only remotely are added.
 * - Elements present only locally are preserved.
 */
export function mergeIncoming(
  local: readonly ExcalidrawElement[],
  incoming: readonly ExcalidrawElement[],
): ExcalidrawElement[] {
  const byId = new Map(local.map((e) => [e.id, e]));
  for (const remote of incoming) {
    const mine = byId.get(remote.id);
    if (!mine || incomingWins(mine, remote)) byId.set(remote.id, remote);
  }
  return [...byId.values()];
}

/**
 * Collect elements whose version has advanced beyond what the ledger recorded.
 *
 * The ledger maps element id → last-known version. Elements at or below their
 * ledger version are suppressed — this is the echo-prevention mechanism that
 * stops remote updates from bouncing back to the server.
 */
export function collectLocalChanges(
  elements: readonly ExcalidrawElement[],
  ledger: ReadonlyMap<string, number>,
): ExcalidrawElement[] {
  const changed: ExcalidrawElement[] = [];
  for (const el of elements) {
    const seen = ledger.get(el.id);
    if (seen === undefined || el.version > seen) changed.push(el);
  }
  return changed;
}
