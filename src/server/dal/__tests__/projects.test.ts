import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @clerk/nextjs/server
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

// Mock the db module
vi.mock("../../db", () => ({
  db: {
    workspace: { upsert: vi.fn() },
    project: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock liveblocks-stub
vi.mock("../../liveblocks-stub", () => ({
  provisionRoom: vi.fn(),
  decommissionRoom: vi.fn(),
  roomIdForProject: vi.fn((id: string) => `room_${id}`),
}));

import { auth } from "@clerk/nextjs/server";
import { db } from "../../db";
import { decommissionRoom, provisionRoom } from "../../liveblocks-stub";
import {
  createProject,
  deleteProject,
  getProject,
  getProjectWithSnapshot,
  listProjects,
} from "../projects";

const mockAuth = vi.mocked(auth);
const mockUpsert = vi.mocked(db.workspace.upsert);
const mockFindMany = vi.mocked(db.project.findMany);
const mockFindFirst = vi.mocked(db.project.findFirst);
const mockCreate = vi.mocked(db.project.create);
const mockUpdate = vi.mocked(db.project.update);
const mockDelete = vi.mocked(db.project.delete);
const mockProvisionRoom = vi.mocked(provisionRoom);
const mockDecommissionRoom = vi.mocked(decommissionRoom);

function setupAuthenticatedSession() {
  mockAuth.mockResolvedValue({
    isAuthenticated: true,
    userId: "user_123",
    orgId: "org_123",
    orgSlug: "my-org",
  } as any);
  mockUpsert.mockResolvedValue({ id: "ws_1", slug: "my-org" } as any);
}

describe("listProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedSession();
  });

  it("returns projects for the workspace ordered by updatedAt desc", async () => {
    const projects = [
      { id: "p1", name: "Project 1", updatedAt: new Date("2026-01-02") },
      { id: "p2", name: "Project 2", updatedAt: new Date("2026-01-01") },
    ];
    mockFindMany.mockResolvedValue(projects as any);

    const result = await listProjects("my-org");

    expect(result).toEqual(projects);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws_1" },
      select: { id: true, name: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("user in different workspace gets redirected (NotFound behavior)", async () => {
    // Session org is 'my-org' but request is for 'other-org'
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_123",
      orgId: "org_123",
      orgSlug: "my-org",
    } as any);

    await expect(listProjects("other-org")).rejects.toThrow(
      "REDIRECT:/w/my-org",
    );
  });
});

describe("getProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedSession();
  });

  it("returns project detail when found in workspace", async () => {
    const project = {
      id: "p1",
      name: "Test",
      updatedAt: new Date(),
      liveblocksRoomId: "room_p1",
    };
    mockFindFirst.mockResolvedValue(project as any);

    const result = await getProject("my-org", "p1");
    expect(result).toEqual(project);
  });

  it("calls notFound when project does not exist in workspace — never leaks existence", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(getProject("my-org", "nonexistent")).rejects.toThrow(
      "NOT_FOUND",
    );
  });

  it("user in different workspace gets redirected, not forbidden", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_456",
      orgId: "org_other",
      orgSlug: "other-org",
    } as any);

    await expect(getProject("my-org", "p1")).rejects.toThrow(
      "REDIRECT:/w/other-org",
    );
  });
});

describe("getProjectWithSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedSession();
  });

  it("returns project with snapshot elements", async () => {
    const elements = [{ type: "rectangle", id: "el_1" }];
    mockFindFirst.mockResolvedValue({
      id: "p1",
      name: "Canvas Project",
      updatedAt: new Date("2026-01-01"),
      liveblocksRoomId: "room_p1",
      canvas: { elements },
    } as any);

    const result = await getProjectWithSnapshot("my-org", "p1");

    expect(result).toEqual({
      id: "p1",
      name: "Canvas Project",
      updatedAt: new Date("2026-01-01"),
      liveblocksRoomId: "room_p1",
      snapshotElements: elements,
    });
  });

  it("returns empty array when no canvas snapshot exists", async () => {
    mockFindFirst.mockResolvedValue({
      id: "p1",
      name: "No Canvas",
      updatedAt: new Date("2026-01-01"),
      liveblocksRoomId: "room_p1",
      canvas: null,
    } as any);

    const result = await getProjectWithSnapshot("my-org", "p1");

    expect(result.snapshotElements).toEqual([]);
  });

  it("calls notFound when project not in workspace", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      getProjectWithSnapshot("my-org", "nonexistent"),
    ).rejects.toThrow("NOT_FOUND");
  });
});

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedSession();
  });

  it("creates project, provisions room, and updates liveblocksRoomId", async () => {
    const created = {
      id: "p1",
      name: "New",
      updatedAt: new Date(),
      liveblocksRoomId: "",
    };
    const updated = {
      id: "p1",
      name: "New",
      updatedAt: new Date(),
      liveblocksRoomId: "room_p1",
    };
    mockCreate.mockResolvedValue(created as any);
    mockProvisionRoom.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(updated as any);

    const result = await createProject("my-org", "New");

    expect(result).toEqual(updated);
    expect(mockProvisionRoom).toHaveBeenCalledWith({
      roomId: "room_p1",
      workspaceId: "ws_1",
      clerkOrgId: "org_123",
    });
  });

  it("rolls back project row when provisionRoom fails", async () => {
    const created = {
      id: "p1",
      name: "New",
      updatedAt: new Date(),
      liveblocksRoomId: "",
    };
    mockCreate.mockResolvedValue(created as any);
    mockProvisionRoom.mockRejectedValue(new Error("Liveblocks unavailable"));

    await expect(createProject("my-org", "New")).rejects.toThrow(
      "Liveblocks unavailable",
    );
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});

describe("deleteProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedSession();
  });

  it("decommissions room then deletes project", async () => {
    mockFindFirst.mockResolvedValue({
      id: "p1",
      liveblocksRoomId: "room_p1",
    } as any);
    mockDecommissionRoom.mockResolvedValue(undefined);

    await deleteProject("my-org", "p1");

    expect(mockDecommissionRoom).toHaveBeenCalledWith("room_p1");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("proceeds with delete even when decommissionRoom fails (best-effort)", async () => {
    mockFindFirst.mockResolvedValue({
      id: "p1",
      liveblocksRoomId: "room_p1",
    } as any);
    mockDecommissionRoom.mockRejectedValue(new Error("Room stuck"));

    await deleteProject("my-org", "p1");

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("calls notFound for nonexistent project — never leaks existence", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(deleteProject("my-org", "nonexistent")).rejects.toThrow(
      "NOT_FOUND",
    );
  });

  it("user in different workspace gets redirected, not forbidden", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_456",
      orgId: "org_other",
      orgSlug: "other-org",
    } as any);

    await expect(deleteProject("my-org", "p1")).rejects.toThrow(
      "REDIRECT:/w/other-org",
    );
  });
});
