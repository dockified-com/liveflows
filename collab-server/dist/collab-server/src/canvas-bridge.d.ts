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
export type ElementShape = {
    id: string;
    version: number;
    versionNonce: number;
    isDeleted?: boolean;
    [key: string]: unknown;
};
/**
 * Reads all elements from the Y.Map and returns them as a plain array.
 * Used by onStoreDocument to write CanvasSnapshot.elements.
 */
export declare function elementsFromYMap(yMap: Map<string, unknown>): ElementShape[];
/**
 * Merges an incoming element into the Y.Map applying Excalidraw's
 * version/versionNonce last-write-wins semantics.
 *
 * Called server-side when MCP writes elements (Task 08).
 * Client-side reconciliation still uses element-sync.ts unchanged (AC-9).
 */
export declare function mergeElementIntoYMap(yMap: Map<string, unknown>, incoming: ElementShape): void;
//# sourceMappingURL=canvas-bridge.d.ts.map