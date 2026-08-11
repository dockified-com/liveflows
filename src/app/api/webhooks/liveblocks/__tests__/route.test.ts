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
    processedWebhook: { create: vi.fn() },
    project: { findUnique: vi.fn() },
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

const mockProcessedCreate = vi.mocked(db.processedWebhook.create);
const mockProjectFindUnique = vi.mocked(db.project.findUnique);
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/liveblocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessedCreate.mockResolvedValue({} as never);
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
      expect(mockProcessedCreate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // IDEMPOTENCY: Duplicate delivery
  // =========================================================================

  describe("idempotency", () => {
    it("returns 200 and skips handler when svix-id was already processed", async () => {
      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId: "proj_1", projectId: "proj", updatedAt: new Date().toISOString() },
      });

      // Simulate unique constraint violation
      mockProcessedCreate.mockRejectedValue(
        new Error("Unique constraint failed on the fields: (`id`)"),
      );

      const req = makeRequest({}, "msg_duplicate");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Already processed");
      expect(mockProjectFindUnique).not.toHaveBeenCalled();
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
      expect(mockProjectFindUnique).not.toHaveBeenCalled();
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
  // MISSING PROJECT: Room not in Postgres
  // =========================================================================

  describe("missing project", () => {
    it("returns 200 when no project matches the roomId", async () => {
      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId: "proj_orphan", projectId: "orphan", updatedAt: new Date().toISOString() },
      });

      mockProjectFindUnique.mockResolvedValue(null);

      const req = makeRequest({}, "msg_orphan");
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
        data: { roomId, projectId: "proj", updatedAt: new Date().toISOString() },
      });

      mockProjectFindUnique.mockResolvedValue({ id: projectId });

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
        where: { projectId },
        create: {
          projectId,
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
          elements: expect.any(Array),
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
        data: { roomId, projectId: "proj", updatedAt: new Date().toISOString() },
      });

      mockProjectFindUnique.mockResolvedValue({ id: projectId });

      setupStorageDoc({}, {});

      const req = makeRequest({}, "msg_empty");
      const res = await POST(req);

      expect(res.status).toBe(200);

      expect(mockCanvasUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            elements: [],
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
        data: { roomId, projectId: "proj", updatedAt: new Date().toISOString() },
      });

      mockProjectFindUnique.mockResolvedValue({ id: projectId });

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
  });

  // =========================================================================
  // HANDLER ERROR: Storage fetch fails
  // =========================================================================

  describe("handler errors", () => {
    it("returns 500 when storage fetch throws", async () => {
      const roomId = "proj_fail";

      mockVerifyRequest.mockReturnValue({
        type: "storageUpdated",
        data: { roomId, projectId: "proj", updatedAt: new Date().toISOString() },
      });

      mockProjectFindUnique.mockResolvedValue({ id: "p_fail" });

      mockGetStorage.mockRejectedValue(new Error("Network error"));

      const req = makeRequest({}, "msg_fail");
      const res = await POST(req);

      expect(res.status).toBe(500);
      expect(await res.text()).toBe("Handler error");
    });
  });
});
