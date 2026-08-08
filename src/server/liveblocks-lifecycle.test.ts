import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before anything else — including vi.mock factories and imports.
const { mockCreateRoom, mockInitializeStorageDocument, mockDeleteRoom } =
  vi.hoisted(() => {
    // Also set env var here so it's available before liveblocks.ts loads
    process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_fake";

    return {
      mockCreateRoom: vi.fn(),
      mockInitializeStorageDocument: vi.fn(),
      mockDeleteRoom: vi.fn(),
    };
  });

// Mock ONLY the external boundary (@liveblocks/node).
vi.mock("@liveblocks/node", () => {
  return {
    Liveblocks: class MockLiveblocks {
      createRoom = mockCreateRoom;
      initializeStorageDocument = mockInitializeStorageDocument;
      deleteRoom = mockDeleteRoom;
    },
  };
});

// Import the REAL module — NOT a mock. The functions under test are exercised
// against the mocked Liveblocks SDK instance created above.
import {
  decommissionRoom,
  provisionRoom,
  roomIdForProject,
} from "@/server/liveblocks";

describe("roomIdForProject", () => {
  it("returns proj_ prefixed id", () => {
    expect(roomIdForProject("abc123")).toBe("proj_abc123");
  });
});

describe("provisionRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates room with correct permissions and seeds empty storage", async () => {
    mockCreateRoom.mockResolvedValue({ id: "proj_abc" });
    mockInitializeStorageDocument.mockResolvedValue({});

    await provisionRoom({
      roomId: "proj_abc",
      workspaceId: "ws_xyz",
      clerkOrgId: "org_123",
    });

    expect(mockCreateRoom).toHaveBeenCalledWith("proj_abc", {
      defaultAccesses: [],
      groupsAccesses: { ws_xyz: ["*:write"] },
      organizationId: "org_123",
    });

    expect(mockInitializeStorageDocument).toHaveBeenCalledWith(
      "proj_abc",
      expect.objectContaining({
        liveblocksType: "LiveObject",
        data: expect.objectContaining({
          elements: expect.objectContaining({ liveblocksType: "LiveMap" }),
          meta: expect.objectContaining({ liveblocksType: "LiveObject" }),
        }),
      }),
    );
  });

  it("throws if createRoom fails so the caller can roll back", async () => {
    mockCreateRoom.mockRejectedValue(new Error("Liveblocks 500"));

    await expect(
      provisionRoom({
        roomId: "proj_abc",
        workspaceId: "ws_xyz",
        clerkOrgId: "org_123",
      }),
    ).rejects.toThrow("Liveblocks 500");
  });

  it("throws if initializeStorageDocument fails", async () => {
    mockCreateRoom.mockResolvedValue({ id: "proj_abc" });
    mockInitializeStorageDocument.mockRejectedValue(
      new Error("Storage init failed"),
    );

    await expect(
      provisionRoom({
        roomId: "proj_abc",
        workspaceId: "ws_xyz",
        clerkOrgId: "org_123",
      }),
    ).rejects.toThrow("Storage init failed");
  });
});

describe("decommissionRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes room and resolves", async () => {
    mockDeleteRoom.mockResolvedValue(undefined);

    await expect(decommissionRoom("proj_abc")).resolves.toBeUndefined();
    expect(mockDeleteRoom).toHaveBeenCalledWith("proj_abc");
  });

  it("logs and resolves on failure — never throws", async () => {
    mockDeleteRoom.mockRejectedValue(new Error("Network error"));

    // Must NOT throw — best-effort
    await expect(decommissionRoom("proj_abc")).resolves.toBeUndefined();
  });
});
