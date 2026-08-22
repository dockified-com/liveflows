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
vi.mock("../../db", () => {
  const mockDb: any = {
    workspace: { upsert: vi.fn() },
    project: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectMember: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    file: { findMany: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: any) => any) => cb(mockDb)),
  };
  return { db: mockDb };
});

import { auth } from "@clerk/nextjs/server";
import { db } from "../../db";
import {
  createProject,
  deleteProject,
  getProject,
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

    await expect(listProjects("nonexistent")).rejects.toThrow(
      "REDIRECT:/sign-in",
    );
  });
});

describe("getProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedSession();
  });

  it("returns the project when it exists in the workspace", async () => {
    const project = {
      id: "p1",
      name: "A",
      visibility: "workspace",
      members: [{ role: "owner" }],
      updatedAt: new Date(),
    };
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

    await expect(getProject("my-org", "p1")).rejects.toThrow(
      "REDIRECT:/sign-in",
    );
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

  it("deletes project directly from DB", async () => {
    mockFindFirst.mockResolvedValue({
      id: "p1",
      visibility: "workspace",
      members: [{ role: "owner" }],
    } as any);

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
