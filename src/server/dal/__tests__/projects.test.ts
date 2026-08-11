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
    file: { findMany: vi.fn() },
  },
}));

// Mock liveblocks
vi.mock("../../liveblocks", () => ({
  provisionRoom: vi.fn(),
  decommissionRoom: vi.fn(),
  roomIdForProject: vi.fn((id: string) => `room_${id}`),
}));

import { auth } from "@clerk/nextjs/server";
import { db } from "../../db";
import { decommissionRoom, provisionRoom } from "../../liveblocks";
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
const mockFileFindMany = vi.mocked(db.file.findMany);
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

  it("returns projects for the workspace", async () => {
    const projects = [
      { id: "p1", name: "A", updatedAt: new Date() },
      { id: "p2", name: "B", updatedAt: new Date() },
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

  it("redirects to sign-in when workspace does not exist / user is not member", async () => {
    mockAuth.mockResolvedValue({
      userId: "u1",
      orgId: null,
    } as any);

    await expect(listProjects("nonexistent")).rejects.toThrow("REDIRECT:/sign-in");
  });
});

describe("getProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedSession();
  });

  it("returns the project when it exists in the workspace", async () => {
    const project = { id: "p1", name: "A", updatedAt: new Date() };
    mockFindFirst.mockResolvedValue(project as any);

    const result = await getProject("my-org", "p1");
    expect(result).toEqual(project);
  });

  it("calls notFound when project does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(getProject("my-org", "nonexistent")).rejects.toThrow(
      "NOT_FOUND",
    );
  });

  it("redirects to sign-in when user is not in workspace", async () => {
    mockAuth.mockResolvedValue({
      userId: "u1",
      orgId: null,
    } as any);

    await expect(getProject("my-org", "p1")).rejects.toThrow("REDIRECT:/sign-in");
  });
});

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedSession();
  });

  it("creates project row", async () => {
    const created = {
      id: "p1",
      name: "New",
      updatedAt: new Date(),
    };
    mockCreate.mockResolvedValue(created as any);

    const result = await createProject("my-org", "New");

    expect(result).toEqual(created);
  });
});

describe("deleteProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedSession();
  });

  it("decommissions rooms for all files then deletes project", async () => {
    mockFindFirst.mockResolvedValue({
      id: "p1",
    } as any);
    mockFileFindMany.mockResolvedValue([
      { liveblocksRoomId: "room_f1" },
      { liveblocksRoomId: null },
      { liveblocksRoomId: "room_f3" }
    ] as any);
    mockDecommissionRoom.mockResolvedValue(undefined);

    await deleteProject("my-org", "p1");

    expect(mockDecommissionRoom).toHaveBeenCalledWith("room_f1");
    expect(mockDecommissionRoom).toHaveBeenCalledWith("room_f3");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("proceeds with delete even when decommissionRoom fails (best-effort)", async () => {
    mockFindFirst.mockResolvedValue({
      id: "p1",
    } as any);
    mockFileFindMany.mockResolvedValue([
      { liveblocksRoomId: "room_f1" }
    ] as any);
    mockDecommissionRoom.mockRejectedValue(new Error("Room stuck"));

    await deleteProject("my-org", "p1");

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
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
