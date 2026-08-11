import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
});

// Set env var before liveblocks.ts loads using vi.hoisted
vi.hoisted(() => {
  process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_fake";
});

// --- Mock Setup ---
const { hoistedCreateRoom, hoistedInitializeStorageDocument, hoistedDeleteRoom } = vi.hoisted(() => {
  return {
    hoistedCreateRoom: vi.fn(),
    hoistedInitializeStorageDocument: vi.fn(),
    hoistedDeleteRoom: vi.fn(),
  };
});

vi.mock("@liveblocks/node", () => ({
  Liveblocks: class MockLiveblocks {
    createRoom = hoistedCreateRoom;
    initializeStorageDocument = hoistedInitializeStorageDocument;
    deleteRoom = hoistedDeleteRoom;
  },
}));

import {
  decommissionRoom,
  liveblocks,
  provisionRoom,
  roomIdForFile,
} from "./liveblocks";

const mockCreateRoom = vi.mocked(liveblocks.createRoom);
const mockInitializeStorageDocument = vi.mocked(
  liveblocks.initializeStorageDocument,
);
const mockDeleteRoom = vi.mocked(liveblocks.deleteRoom);

describe("roomIdForFile", () => {
  it("returns file_ prefixed id", () => {
    expect(roomIdForFile("abc123")).toBe("file_abc123");
  });
});

describe("provisionRoom", () => {
  it("creates room with correct permissions and seeds empty storage for canvas", async () => {
    await provisionRoom({
      roomId: "file_abc",
      workspaceId: "ws_456",
      clerkOrgId: "org_123",
      type: "canvas",
    });

    expect(mockCreateRoom).toHaveBeenCalledWith("file_abc", {
      defaultAccesses: [],
      groupsAccesses: { ws_456: ["*:write"] },
      organizationId: "org_123",
    });

    expect(mockInitializeStorageDocument).toHaveBeenCalledWith(
      "file_abc",
      expect.objectContaining({
        liveblocksType: "LiveObject",
      }),
    );
  });

  it("creates room but does not seed storage for document type", async () => {
    await provisionRoom({
      roomId: "file_abc",
      workspaceId: "ws_456",
      clerkOrgId: "org_123",
      type: "document",
    });

    expect(mockCreateRoom).toHaveBeenCalledWith("file_abc", expect.any(Object));
    expect(mockInitializeStorageDocument).not.toHaveBeenCalled();
  });

  it("throws if createRoom fails so the caller can roll back", async () => {
    mockCreateRoom.mockRejectedValue(new Error("Network error"));

    await expect(
      provisionRoom({
        roomId: "file_abc",
        workspaceId: "ws_456",
        clerkOrgId: "org_123",
        type: "canvas",
      }),
    ).rejects.toThrow("Network error");
  });

  it("throws if initializeStorageDocument fails", async () => {
    mockCreateRoom.mockResolvedValue({} as any);
    mockInitializeStorageDocument.mockRejectedValue(
      new Error("Storage init failed"),
    );

    await expect(
      provisionRoom({
        roomId: "file_abc",
        workspaceId: "ws_456",
        clerkOrgId: "org_123",
        type: "canvas",
      }),
    ).rejects.toThrow("Storage init failed");
  });
});

describe("decommissionRoom", () => {
  it("deletes room and resolves", async () => {
    mockDeleteRoom.mockResolvedValue();

    await decommissionRoom("file_abc");
    expect(mockDeleteRoom).toHaveBeenCalledWith("file_abc");
  });

  it("logs and resolves on failure — never throws", async () => {
    mockDeleteRoom.mockRejectedValue(new Error("Network error"));
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await decommissionRoom("file_abc");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to delete room file_abc"),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
