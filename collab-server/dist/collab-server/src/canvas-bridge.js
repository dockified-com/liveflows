/**
 * canvas-bridge.ts — Y.Map <-> Excalidraw element shape.
 *
 * Y.Map<string, ExcalidrawElement> keyed by element id is the direct analogue
 * of the Liveblocks LiveMap it replaces. element-sync.ts is preserved and
 * unchanged; this bridge handles the Y.Map observation side on the server.
 *
 * The reconciliation logic (mergeIncoming, collectLocalChanges) still runs
 * in canvas-room.tsx on the client — only the transport changes.
 */
/**
 * Reads all elements from the Y.Map and returns them as a plain array.
 * Used by onStoreDocument to write CanvasSnapshot.elements.
 */
export function elementsFromYMap(yMap) {
    return Array.from(yMap.values());
}
/**
 * Merges an incoming element into the Y.Map applying Excalidraw's
 * version/versionNonce last-write-wins semantics.
 *
 * Called server-side when MCP writes elements (Task 08).
 * Client-side reconciliation still uses element-sync.ts unchanged (AC-9).
 */
export function mergeElementIntoYMap(yMap, incoming) {
    const existing = yMap.get(incoming.id);
    if (!existing) {
        yMap.set(incoming.id, incoming);
        return;
    }
    if (incoming.version > existing.version ||
        (incoming.version === existing.version &&
            incoming.versionNonce < existing.versionNonce)) {
        yMap.set(incoming.id, incoming);
    }
}
//# sourceMappingURL=canvas-bridge.js.map