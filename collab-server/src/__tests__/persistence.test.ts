import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";

const {
  mockFileFindUnique,
  mockCanvasSnapshotUpsert,
  mockCanvasSnapshotFindUnique,
  mockDocumentSnapshotUpsert,
  mockDocumentSnapshotFindUnique,
} = vi.hoisted(() => ({
  mockFileFindUnique: vi.fn(),
  mockCanvasSnapshotUpsert: vi.fn(),
  mockCanvasSnapshotFindUnique: vi.fn(),
  mockDocumentSnapshotUpsert: vi.fn(),
  mockDocumentSnapshotFindUnique: vi.fn(),
}));

vi.mock("../db.js", () => ({
  db: {
    file: { findUnique: (...args: unknown[]) => mockFileFindUnique(...args) },
    canvasSnapshot: {
      upsert: (...args: unknown[]) => mockCanvasSnapshotUpsert(...args),
      findUnique: (...args: unknown[]) => mockCanvasSnapshotFindUnique(...args),
    },
    documentSnapshot: {
      upsert: (...args: unknown[]) => mockDocumentSnapshotUpsert(...args),
      findUnique: (...args: unknown[]) =>
        mockDocumentSnapshotFindUnique(...args),
    },
  },
}));

import { onLoadDocument, onStoreDocument } from "../persistence.js";

describe("persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onLoadDocument (seeding, AC-11)", () => {
    it("seeds canvas document with elements and appState from Postgres", async () => {
      mockFileFindUnique.mockResolvedValue({ type: "canvas" });
      mockCanvasSnapshotFindUnique.mockResolvedValue({
        fileId: "canvas_1",
        elements: [
          { id: "el_1", version: 1, versionNonce: 10, type: "rectangle" },
        ],
        appState: { viewBackgroundColor: "#ffffff" },
        elementCount: 1,
      });

      const doc = new Y.Doc();
      await onLoadDocument({ documentName: "canvas_1", document: doc });

      const yMap = doc.getMap("elements");
      expect(yMap.get("el_1")).toEqual({
        id: "el_1",
        version: 1,
        versionNonce: 10,
        type: "rectangle",
      });

      const appStateMap = doc.getMap("appState");
      expect(appStateMap.get("viewBackgroundColor")).toBe("#ffffff");
    });

    it("seeds document from DocumentSnapshot.yjsUpdate binary", async () => {
      mockFileFindUnique.mockResolvedValue({ type: "document" });

      // Create a source doc and encode its binary update
      const sourceDoc = new Y.Doc();
      const fragment = sourceDoc.getXmlFragment("default");
      sourceDoc.transact(() => {
        const p = new Y.XmlElement("paragraph");
        p.insert(0, [new Y.XmlText("Hello LiveFlows")]);
        fragment.insert(0, [p]);
      });
      const update = Y.encodeStateAsUpdate(sourceDoc);

      mockDocumentSnapshotFindUnique.mockResolvedValue({
        fileId: "doc_1",
        yjsUpdate: Buffer.from(update),
      });

      const targetDoc = new Y.Doc();
      await onLoadDocument({ documentName: "doc_1", document: targetDoc });

      const targetFragment = targetDoc.getXmlFragment("default");
      expect(targetFragment.toString()).toBe(
        "<paragraph>Hello LiveFlows</paragraph>",
      );
    });
  });

  describe("onStoreDocument (persistence, AC-10)", () => {
    it("persists canvas elements and appState to CanvasSnapshot", async () => {
      mockFileFindUnique.mockResolvedValue({ type: "canvas" });
      mockCanvasSnapshotUpsert.mockResolvedValue({});

      const doc = new Y.Doc();
      const yMap = doc.getMap("elements");
      yMap.set("el_1", { id: "el_1", isDeleted: false, type: "rectangle" });
      yMap.set("el_2", { id: "el_2", isDeleted: true, type: "ellipse" });

      const appStateMap = doc.getMap("appState");
      appStateMap.set("viewBackgroundColor", "#fafafa");

      // Use fake timers or call directly
      vi.useFakeTimers();
      await onStoreDocument({ documentName: "canvas_1", document: doc });
      vi.runAllTimers();
      vi.useRealTimers();

      // Wait a tick for async persist to complete
      await new Promise((r) => setTimeout(r, 10));

      expect(mockCanvasSnapshotUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fileId: "canvas_1" },
          create: expect.objectContaining({
            fileId: "canvas_1",
            elementCount: 1, // only non-deleted
          }),
        }),
      );
    });

    it("persists document with lossless yjsUpdate and content to DocumentSnapshot", async () => {
      mockFileFindUnique.mockResolvedValue({ type: "document" });
      mockDocumentSnapshotUpsert.mockResolvedValue({});

      const doc = new Y.Doc();
      const fragment = doc.getXmlFragment("default");
      doc.transact(() => {
        fragment.insert(0, [new Y.XmlText("Testing persistence")]);
      });

      vi.useFakeTimers();
      await onStoreDocument({ documentName: "doc_1", document: doc });
      vi.runAllTimers();
      vi.useRealTimers();

      await new Promise((r) => setTimeout(r, 10));

      expect(mockDocumentSnapshotUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fileId: "doc_1" },
          create: expect.objectContaining({
            fileId: "doc_1",
            yjsUpdate: expect.any(Buffer),
          }),
        }),
      );
    });
  });
});
