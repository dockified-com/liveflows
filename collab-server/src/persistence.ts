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
import { db } from "./db.js";

/** Derive whether a document name is a canvas or document file. */
async function getFileType(
  fileId: string,
): Promise<"canvas" | "document" | null> {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { type: true },
  });
  return (file?.type as "canvas" | "document") ?? null;
}

/** Count non-deleted Excalidraw elements. */
function countNonDeleted(elements: unknown[]): number {
  return elements.filter(
    (el): el is { isDeleted?: boolean } =>
      typeof el === "object" &&
      el !== null &&
      !(el as { isDeleted?: boolean }).isDeleted,
  ).length;
}

/**
 * Debounce map: fileId → timer handle.
 * Cleared on server shutdown.
 */
const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 2_000;
const MAX_DEBOUNCE_MS = 10_000;
const firstSeenMap = new Map<string, number>();

export async function onStoreDocument({
  documentName,
  document,
}: {
  documentName: string;
  document: Y.Doc;
}): Promise<void> {
  const fileId = documentName;

  // Track first-seen time for maxDebounce enforcement
  if (!firstSeenMap.has(fileId)) {
    firstSeenMap.set(fileId, Date.now());
  }

  const elapsed = Date.now() - (firstSeenMap.get(fileId) ?? Date.now());
  const shouldFlush = elapsed >= MAX_DEBOUNCE_MS;

  const existing = debounceMap.get(fileId);
  if (existing) clearTimeout(existing);

  const persist = async () => {
    debounceMap.delete(fileId);
    firstSeenMap.delete(fileId);

    try {
      const type = await getFileType(fileId);
      if (!type) return; // file deleted

      if (type === "canvas") {
        await persistCanvas(fileId, document);
      } else {
        await persistDocument(fileId, document);
      }
    } catch (err) {
      console.error(`[collab] Failed to persist ${fileId}:`, err);
    }
  };

  if (shouldFlush) {
    await persist();
  } else {
    debounceMap.set(fileId, setTimeout(persist, DEBOUNCE_MS));
  }
}

async function persistCanvas(fileId: string, doc: Y.Doc): Promise<void> {
  const yMap = doc.getMap<unknown>("elements");
  const elements = Array.from(yMap.values());
  const elementCount = countNonDeleted(elements);

  // appState: stored in a separate Y.Map("appState")
  const appStateMap = doc.getMap<unknown>("appState");
  const appState = Object.fromEntries(appStateMap.entries());

  await db.canvasSnapshot.upsert({
    where: { fileId },
    create: {
      fileId,
      // biome-ignore lint/suspicious/noExplicitAny: JSON column typing
      elements: elements as any,
      // biome-ignore lint/suspicious/noExplicitAny: JSON column typing
      appState: appState as any,
      elementCount,
    },
    update: {
      // biome-ignore lint/suspicious/noExplicitAny: JSON column typing
      elements: elements as any,
      // biome-ignore lint/suspicious/noExplicitAny: JSON column typing
      appState: appState as any,
      elementCount,
      syncedAt: new Date(),
    },
  });
}

async function persistDocument(fileId: string, doc: Y.Doc): Promise<void> {
  // Binary update (lossless) for seeding
  const yjsUpdate = Buffer.from(Y.encodeStateAsUpdate(doc));

  // ProseMirror JSON (readable) for MCP tools, search, outage fallback.
  // We store the raw Yjs XML fragment as JSON; consumers that need PM JSON
  // can reconstruct it from the Yjs doc.
  const fragment = doc.getXmlFragment("default");
  const content = { xml: fragment.toString() };

  await db.documentSnapshot.upsert({
    where: { fileId },
    create: { fileId, content, yjsUpdate },
    update: { content, yjsUpdate, syncedAt: new Date() },
  });
}

export async function onLoadDocument({
  documentName,
  document,
}: {
  documentName: string;
  document: Y.Doc;
}): Promise<void> {
  const fileId = documentName;

  try {
    const type = await getFileType(fileId);
    if (!type) return;

    if (type === "canvas") {
      await seedCanvas(fileId, document);
    } else {
      await seedDocument(fileId, document);
    }
  } catch (err) {
    console.error(`[collab] Failed to seed ${fileId}:`, err);
  }
}

async function seedCanvas(fileId: string, doc: Y.Doc): Promise<void> {
  const snapshot = await db.canvasSnapshot.findUnique({ where: { fileId } });
  if (!snapshot) return;

  const elements = snapshot.elements as Array<
    { id: string } & Record<string, unknown>
  >;
  if (!elements || elements.length === 0) return;

  const yMap = doc.getMap<unknown>("elements");
  doc.transact(() => {
    for (const el of elements) {
      if (!yMap.has(el.id)) {
        yMap.set(el.id, el);
      }
    }
  });

  const appState = snapshot.appState as Record<string, unknown>;
  if (appState && Object.keys(appState).length > 0) {
    const appStateMap = doc.getMap<unknown>("appState");
    doc.transact(() => {
      for (const [k, v] of Object.entries(appState)) {
        appStateMap.set(k, v);
      }
    });
  }
}

async function seedDocument(fileId: string, doc: Y.Doc): Promise<void> {
  const snapshot = await db.documentSnapshot.findUnique({ where: { fileId } });
  if (!snapshot?.yjsUpdate) return;

  // Apply binary update — lossless, preserves CRDT history
  Y.applyUpdate(doc, snapshot.yjsUpdate);
}
