import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — boundary only: Liveblocks WebhookHandler and Prisma
// ---------------------------------------------------------------------------

// Shared instance: the route calls `new WebhookHandler(...)` at module level,
// so the constructor must return an object with `verifyRequest` immediately.
// vi.hoisted() ensures the mock fn exists before the hoisted vi.mock factory runs.
const { mockVerifyRequest } = vi.hoisted(() => ({
  mockVerifyRequest: vi.fn(),
}));

vi.mock("@liveblocks/node", () => ({
  WebhookHandler: vi.fn(function () {
    return { verifyRequest: mockVerifyRequest };
  }),
}));

vi.mock("@/server/db", () => ({
  db: {
    processedWebhook: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    file: { findUnique: vi.fn() },
    canvasSnapshot: { upsert: vi.fn() },
  },
}));

vi.mock("@/server/liveblocks", () => ({
  liveblocks: {
    getStorageDocument: vi.fn(),
  },
}));

import { db } from "@/server/db";
import { liveblocks } from "@/server/liveblocks";
import { POST } from "../route";

const mockProcessedFindUnique = vi.mocked(db.processedWebhook.findUnique);
const mockProcessedCreate = vi.mocked(db.processedWebhook.create);
const mockProcessedUpdate = vi.mocked(db.processedWebhook.update);
const mockFileFindUnique = vi.mocked(db.file.findUnique);
const mockCanvasUpsert = vi.mocked(db.canvasSnapshot.upsert);
const mockGetStorage = vi.mocked(liveblocks.getStorageDocument);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: object = {}, svixId = "msg_test123"): NextRequest {
  return new NextRequest("http://localhost:3000/api/webhooks/liveblocks", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": svixId,
      "webhook-id": "msg_test123",
      "webhook-timestamp": "1614588800000",
      "webhook-signature": "v1,sig",
    },
    body: JSON.stringify(body),
  });
}

function setupStorageDoc(elements: Record<string, unknown>, meta = {}) {
  mockGetStorage.mockResolvedValue({
    elements,
    meta,
  } as never);
}

/** Default setup: no existing row → fresh insert path */
function setupFreshDelivery() {
  mockProcessedFindUnique.mockResolvedValue(null);
  mockProcessedCreate.mockResolvedValue({} as never);
  mockProcessedUpdate.mockResolvedValue({} as never);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/liveblocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFreshDelivery();
  });

  // =========================================================================
  // SECURITY: Signature verification
  // =========================================================================

  describe("signature verification", () => {
    it("returns 400 when signature verification fails", async () => {
      mockVerifyRequest.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const req = makeRequest();
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Bad signature");
      expect(mockProcessedFindUnique).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // IDEMPOTENCY (D44): Duplicate delivery
  // =========================================================================

  describe("idempotency (D44)", () => {
    it("returns 200 immediately when status=completed (already processed)", async () => {
      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId: "proj_1", updatedAt: new Date().toISOString() },
      });
      mockProcessedFindUnique.mockResolvedValue({
        status: "completed",
        leaseUntil: null,
      } as never);

      const req = makeRequest({}, "msg_duplicate");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Already processed");
      expect(mockFileFindUnique).not.toHaveBeenCalled();
    });

    it("returns 409 when status=processing and lease is still active", async () => {
      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId: "proj_1", updatedAt: new Date().toISOString() },
      });
      const futureDate = new Date(Date.now() + 30_000);
      mockProcessedFindUnique.mockResolvedValue({
        status: "processing",
        leaseUntil: futureDate,
      } as never);

      const req = makeRequest({}, "msg_leased");
      const res = await POST(req);

      expect(res.status).toBe(409);
      expect(mockFileFindUnique).not.toHaveBeenCalled();
    });

    it("processes event on first delivery (no existing row)", async () => {
      const roomId = "proj_first";
      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId, updatedAt: new Date().toISOString() },
      });
      mockFileFindUnique.mockResolvedValue({
        id: "f1",
        type: "canvas",
      } as never);
      setupStorageDoc({});

      const req = makeRequest({}, "msg_first");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockProcessedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "msg_first",
            source: "liveblocks",
            status: "processing",
          }),
        }),
      );
      expect(mockProcessedUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "msg_first" },
          data: expect.objectContaining({ status: "completed" }),
        }),
      );
    });

    it("race condition: 409 when create throws (another replica won)", async () => {
      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId: "proj_race", updatedAt: new Date().toISOString() },
      });
      mockProcessedCreate.mockRejectedValue(
        new Error("Unique constraint failed on the fields: (`id`)"),
      );

      const req = makeRequest({}, "msg_race");
      const res = await POST(req);

      expect(res.status).toBe(409);
      expect(mockFileFindUnique).not.toHaveBeenCalled();
    });

    it("retries when previous status=failed (expired or errored)", async () => {
      const roomId = "proj_retry";
      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId, updatedAt: new Date().toISOString() },
      });
      mockProcessedFindUnique.mockResolvedValue({
        status: "failed",
        leaseUntil: null,
      } as never);
      mockFileFindUnique.mockResolvedValue({
        id: "f_retry",
        type: "canvas",
      } as never);
      setupStorageDoc({});

      const req = makeRequest({}, "msg_retry");
      const res = await POST(req);

      expect(res.status).toBe(200);
      // Takes over lease before processing
      expect(mockProcessedUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "msg_retry" },
          data: expect.objectContaining({ status: "processing" }),
        }),
      );
    });
  });

  // =========================================================================
  // EVENT FILTERING: Only storageUpdated
  // =========================================================================

  describe("event filtering", () => {
    it("returns 200 for non-storageUpdated events without mirroring", async () => {
      mockVerifyRequest.mockReturnValue({
        type: "userEntered",
        data: { roomId: "proj_1" },
      });

      const req = makeRequest({}, "msg_enter");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("OK");
      expect(mockFileFindUnique).not.toHaveBeenCalled();
      expect(mockGetStorage).not.toHaveBeenCalled();
    });

    it("returns 200 for roomCreated events without mirroring", async () => {
      mockVerifyRequest.mockReturnValue({
        type: "roomCreated",
        data: { roomId: "proj_1" },
      });

      const req = makeRequest({}, "msg_room");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("OK");
      expect(mockGetStorage).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // MISSING FILE: Room not in Postgres
  // =========================================================================

  describe("missing file", () => {
    it("returns 200 when no file matches the roomId", async () => {
      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId: "proj_orphan", updatedAt: new Date().toISOString() },
      });
      mockFileFindUnique.mockResolvedValue(null);

      const req = makeRequest({}, "msg_orphan");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("OK");
      expect(mockGetStorage).not.toHaveBeenCalled();
    });

    it("returns 200 and skips mirror for non-canvas file types", async () => {
      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId: "proj_doc", updatedAt: new Date().toISOString() },
      });
      mockFileFindUnique.mockResolvedValue({
        id: "f_doc",
        type: "document",
      } as never);

      const req = makeRequest({}, "msg_doc");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("OK");
      expect(mockGetStorage).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SUCCESSFUL MIRROR: storageUpdated → fetch → upsert
  // =========================================================================

  describe("successful mirror", () => {
    it("fetches storage and upserts CanvasSnapshot on storageUpdated", async () => {
      const roomId = "proj_abc";
      const projectId = "p123";

      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId, updatedAt: new Date().toISOString() },
      });

      mockFileFindUnique.mockResolvedValue({
        id: projectId,
        type: "canvas",
      } as never);

      const elements = {
        elem1: { id: "elem1", type: "rectangle", isDeleted: false },
        elem2: { id: "elem2", type: "ellipse", isDeleted: true },
        elem3: { id: "elem3", type: "diamond", isDeleted: false },
      };

      const meta = { viewBackgroundColor: "#ffffff" };

      setupStorageDoc(elements, meta);

      const req = makeRequest({}, "msg_sync");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("OK");

      expect(mockGetStorage).toHaveBeenCalledWith(roomId, "json");

      // elementCount = 3 total - 1 deleted = 2
      expect(mockCanvasUpsert).toHaveBeenCalledWith({
        where: { fileId: projectId },
        create: {
          fileId: projectId,
          elements: expect.arrayContaining([
            { id: "elem1", type: "rectangle", isDeleted: false },
            { id: "elem2", type: "ellipse", isDeleted: true },
            { id: "elem3", type: "diamond", isDeleted: false },
          ]),
          appState: meta,
          elementCount: 2,
          syncedAt: expect.any(Date),
        },
        update: {
          elements: expect.arrayContaining([
            { id: "elem1", type: "rectangle", isDeleted: false },
            { id: "elem2", type: "ellipse", isDeleted: true },
            { id: "elem3", type: "diamond", isDeleted: false },
          ]),
          appState: meta,
          elementCount: 2,
          syncedAt: expect.any(Date),
        },
      });
    });

    it("handles empty elements gracefully", async () => {
      const roomId = "proj_empty";
      const projectId = "p_empty";

      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId, updatedAt: new Date().toISOString() },
      });

      mockFileFindUnique.mockResolvedValue({
        id: projectId,
        type: "canvas",
      } as never);

      setupStorageDoc({}, {});

      const req = makeRequest({}, "msg_empty");
      const res = await POST(req);

      expect(res.status).toBe(200);

      expect(mockCanvasUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fileId: "p_empty" },
          create: expect.objectContaining({
            fileId: "p_empty",
            elementCount: 0,
          }),
        }),
      );
    });

    it("uses empty object for appState when meta is undefined", async () => {
      const roomId = "proj_nometa";
      const projectId = "p_nometa";

      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId, updatedAt: new Date().toISOString() },
      });

      mockFileFindUnique.mockResolvedValue({
        id: projectId,
        type: "canvas",
      } as never);

      // doc without meta key
      mockGetStorage.mockResolvedValue({
        elements: {},
      } as never);

      const req = makeRequest({}, "msg_nometa");
      const res = await POST(req);

      expect(res.status).toBe(200);

      expect(mockCanvasUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            appState: {},
          }),
        }),
      );
    });

    it("marks webhook completed after successful mirror", async () => {
      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId: "proj_done", updatedAt: new Date().toISOString() },
      });
      mockFileFindUnique.mockResolvedValue({
        id: "f_done",
        type: "canvas",
      } as never);
      setupStorageDoc({}, {});

      const req = makeRequest({}, "msg_done");
      await POST(req);

      expect(mockProcessedUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "msg_done" },
          data: expect.objectContaining({
            status: "completed",
            leaseUntil: null,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // HANDLER ERROR: Storage fetch fails
  // =========================================================================

  describe("handler errors", () => {
    it("returns 500 and marks failed when storage fetch throws", async () => {
      const roomId = "proj_fail";

      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId, updatedAt: new Date().toISOString() },
      });

      mockFileFindUnique.mockResolvedValue({
        id: "p_fail",
        type: "canvas",
      } as never);

      mockGetStorage.mockRejectedValue(new Error("Network error"));

      const req = makeRequest({}, "msg_fail");
      const res = await POST(req);

      expect(res.status).toBe(500);
      expect(await res.text()).toBe("Handler error");

      // Should mark the lease as failed
      expect(mockProcessedUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "msg_fail" },
          data: expect.objectContaining({ status: "failed", leaseUntil: null }),
        }),
      );
    });
  });
});
