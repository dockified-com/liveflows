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

/** Derive whether a document name is a canvas or document file and resolve canonical fileId. */
async function resolveFile(
  documentName: string,
): Promise<{ id: string; type: "canvas" | "document" } | null> {
  const normalizedId = documentName.startsWith("file_")
    ? documentName.slice(5)
    : documentName;

  // 1. Try findUnique by documentName or normalizedId
  let file = await db.file.findUnique({
    where: { id: documentName },
    select: { id: true, type: true },
  });

  if (!file && normalizedId !== documentName) {
    file = await db.file.findUnique({
      where: { id: normalizedId },
      select: { id: true, type: true },
    });
  }

  // 2. Fallback to findFirst for roomId
  if (!file && typeof db.file.findFirst === "function") {
    file = await db.file.findFirst({
      where: {
        OR: [{ roomId: documentName }, { roomId: `file_${documentName}` }],
      },
      select: { id: true, type: true },
    });
  }

  if (!file) return null;
  return {
    id: file.id || documentName,
    type: file.type as "canvas" | "document",
  };
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
export async function onStoreDocument({
  documentName,
  document,
}: {
  documentName: string;
  document: Y.Doc;
}): Promise<void> {
  const resolved = await resolveFile(documentName);
  if (!resolved) return;
  const fileId = resolved.id;

  try {
    if (resolved.type === "canvas") {
      await persistCanvas(fileId, document);
    } else {
      await persistDocument(fileId, document);
    }
  } catch (err) {
    console.error(`[collab] Failed to persist ${fileId}:`, err);
  }
}

async function persistCanvas(fileId: string, doc: Y.Doc): Promise<void> {
  const yMap = doc.getMap<unknown>("elements");
  const elements = Array.from(yMap.values());
  const elementCount = countNonDeleted(elements);

  // appState: stored in a separate Y.Map("appState")
  const appStateMap = doc.getMap<unknown>("appState");
  const appState = Object.fromEntries(appStateMap.entries());

  console.log(
    `[collab] Persisting canvas ${fileId} with ${elementCount} elements`,
  );

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

  console.log(
    `[collab] Persisting document ${fileId} to Postgres (${yjsUpdate.length} bytes)`,
  );

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
  try {
    const resolved = await resolveFile(documentName);
    if (!resolved) return;

    if (resolved.type === "canvas") {
      await seedCanvas(resolved.id, document);
    } else {
      await seedDocument(resolved.id, document);
    }
  } catch (err) {
    console.error(`[collab] Failed to seed ${documentName}:`, err);
  }
}

async function seedCanvas(fileId: string, doc: Y.Doc): Promise<void> {
  const snapshot = await db.canvasSnapshot.findUnique({ where: { fileId } });
  if (!snapshot) return;

  const elements = snapshot.elements as Array<
    { id: string } & Record<string, unknown>
  >;
  if (!elements || elements.length === 0) return;

  console.log(
    `[collab] Seeding canvas ${fileId} with ${elements.length} elements`,
  );

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
  if (!snapshot?.yjsUpdate) {
    console.log(
      `[collab] No document snapshot found for ${fileId}, starting fresh`,
    );
    return;
  }

  console.log(
    `[collab] Seeding document ${fileId} from Postgres (${snapshot.yjsUpdate.length} bytes)`,
  );
  // Apply binary update — lossless, preserves CRDT history
  Y.applyUpdate(doc, snapshot.yjsUpdate);
}
