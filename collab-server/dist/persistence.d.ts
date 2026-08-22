/**
 * Hocuspocus persistence: onStoreDocument and onLoadDocument.
 *
 * onStoreDocument: writes CanvasSnapshot (for canvas files) or DocumentSnapshot
 * (for document files), debounced 2s with 10s max. Replaces the storageUpdated
 * Liveblocks webhook.
 *
 * onLoadDocument: seeds from Postgres when the document is not in server memory.
 * For documents: applies DocumentSnapshot.yjsUpdate (lossless binary).
 * For canvases: loads CanvasSnapshot.elements into the Y.Map.
 *
 * Canvas element shape: Y.Map<string, ExcalidrawElement> keyed by element id.
 * This is the direct analogue of the Liveblocks LiveMap it replaces.
 */
import * as Y from "yjs";
export declare function onStoreDocument({ documentName, document, }: {
    documentName: string;
    document: Y.Doc;
}): Promise<void>;
export declare function onLoadDocument({ documentName, document, }: {
    documentName: string;
    document: Y.Doc;
}): Promise<void>;
//# sourceMappingURL=persistence.d.ts.map