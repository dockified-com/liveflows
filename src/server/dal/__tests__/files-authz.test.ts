import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "../../authz/test-support/db";
import {
  makeFile,
  makeFolder,
  makeProject,
  makeProjectMember,
  makeUser,
  makeWorkspace,
} from "../../authz/test-support/factories";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => mockAuth() }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

vi.mock("../../db", async () => {
  const { testDb } = await import("../../authz/test-support/db");
  return { db: testDb };
});

const { createFile, deleteFile, getFileWithSnapshot, renameFile } =
  await import("../files");
const { createFolder, deleteFolder, renameFolder } = await import("../folders");
const { ForbiddenError } = await import("../errors");

function signIn(
  userId: string,
  workspace: { slug: string; clerkOrgId: string },
  orgRole = "org:member",
) {
  mockAuth.mockResolvedValue({
    isAuthenticated: true,
    userId,
    orgId: workspace.clerkOrgId,
    orgSlug: workspace.slug,
    orgRole,
  });
}

async function workspaceWithOrg() {
  const ws = await makeWorkspace();
  const row = await testDb.workspace.findUnique({
    where: { id: ws.id },
    select: { clerkOrgId: true },
  });
  return { ...ws, clerkOrgId: row?.clerkOrgId as string };
}

/** Workspace-visible project plus a viewer row for the given user. */
async function projectWithViewer(userId: string, workspaceId: string) {
  const project = await makeProject({ workspaceId, createdById: userId });
  await makeProjectMember({
    projectId: project.id,
    userId,
    role: "viewer",
  });
  return project;
}

// Top level, NOT inside a describe. An afterAll registered inside a describe
// runs when that block finishes, which would disconnect the client before the
// "folders DAL authorization" block below.
afterAll(async () => {
  await testDb.$disconnect();
});

describe("files DAL authorization", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("lets an editor rename a file", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });
    signIn(user.id, ws);

    const result = await renameFile(ws.slug, file.id, "renamed");

    expect(result.name).toBe("renamed");
  });

  it("refuses a rename by a viewer and leaves the name intact", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
      name: "original",
    });
    signIn(user.id, ws);

    await expect(renameFile(ws.slug, file.id, "hacked")).rejects.toThrow(
      ForbiddenError,
    );

    const unchanged = await testDb.file.findUnique({
      where: { id: file.id },
      select: { name: true },
    });
    expect(unchanged?.name).toBe("original");
  });

  it("refuses a delete by a viewer and leaves the file in place", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });
    signIn(user.id, ws);

    await expect(deleteFile(ws.slug, file.id)).rejects.toThrow(ForbiddenError);

    expect(await testDb.file.count({ where: { projectId: project.id } })).toBe(
      1,
    );
  });

  it("refuses file creation by a viewer", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    signIn(user.id, ws);

    await expect(
      createFile(ws.slug, project.id, null, "new-canvas", "canvas"),
    ).rejects.toThrow(ForbiddenError);

    expect(await testDb.file.count({ where: { projectId: project.id } })).toBe(
      0,
    );
  });

  it("lets an editor create a file", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    signIn(user.id, ws);

    const file = await createFile(
      ws.slug,
      project.id,
      null,
      "diagram",
      "canvas",
    );

    expect(file.name).toBe("diagram");
    expect(file.projectId).toBe(project.id);
  });

  it("lets a viewer read a file", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
      name: "readable",
    });
    signIn(user.id, ws);

    const result = await getFileWithSnapshot(ws.slug, file.id);

    expect(result.name).toBe("readable");
  });

  it("404s a file in a private project for a non-member", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });
    signIn(outsider.id, ws);

    await expect(renameFile(ws.slug, file.id, "x")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("404s a private file read for a non-member rather than erroring", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });
    signIn(outsider.id, ws);

    await expect(getFileWithSnapshot(ws.slug, file.id)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("lets an org admin rename a file in a private project", async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });
    signIn(admin.id, ws, "org:admin");

    const result = await renameFile(ws.slug, file.id, "admin-renamed");

    expect(result.name).toBe("admin-renamed");
  });
});

describe("folders DAL authorization", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("lets an editor rename a folder", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id });
    signIn(user.id, ws);

    const result = await renameFolder(ws.slug, folder.id, "renamed");

    expect(result.name).toBe("renamed");
  });

  it("refuses a folder rename by a viewer", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    const folder = await makeFolder({ projectId: project.id, name: "keep" });
    signIn(user.id, ws);

    await expect(renameFolder(ws.slug, folder.id, "hacked")).rejects.toThrow(
      ForbiddenError,
    );

    const unchanged = await testDb.folder.findUnique({
      where: { id: folder.id },
      select: { name: true },
    });
    expect(unchanged?.name).toBe("keep");
  });

  it("refuses a folder delete by a viewer", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    const folder = await makeFolder({ projectId: project.id });
    signIn(user.id, ws);

    await expect(deleteFolder(ws.slug, folder.id)).rejects.toThrow(
      ForbiddenError,
    );

    expect(
      await testDb.folder.count({ where: { projectId: project.id } }),
    ).toBe(1);
  });

  it("refuses folder creation by a viewer", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await projectWithViewer(user.id, ws.id);
    signIn(user.id, ws);

    await expect(
      createFolder(ws.slug, project.id, null, "new-folder"),
    ).rejects.toThrow(ForbiddenError);

    expect(
      await testDb.folder.count({ where: { projectId: project.id } }),
    ).toBe(0);
  });

  it("lets an editor delete a folder", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id });
    signIn(user.id, ws);

    await deleteFolder(ws.slug, folder.id);

    expect(
      await testDb.folder.count({ where: { projectId: project.id } }),
    ).toBe(0);
  });
});
