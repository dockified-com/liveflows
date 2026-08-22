import { afterAll, describe, expect, it } from "vitest";
import { testDb } from "./db";
import {
  makeFile,
  makeFolder,
  makeProject,
  makeProjectMember,
  makeUser,
  makeWorkspace,
} from "./factories";

describe("test harness", () => {
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("creates a project defaulting to workspace visibility", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });

    const found = await testDb.project.findUnique({
      where: { id: project.id },
      select: { visibility: true, workspaceId: true },
    });

    expect(found?.visibility).toBe("workspace");
    expect(found?.workspaceId).toBe(ws.id);
  });

  it("honours an explicit private visibility", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
      visibility: "private",
    });

    const found = await testDb.project.findUnique({
      where: { id: project.id },
      select: { visibility: true },
    });

    expect(found?.visibility).toBe("private");
  });

  it("creates a project member row", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "viewer",
    });

    const members = await testDb.projectMember.findMany({
      where: { projectId: project.id },
      select: { userId: true, role: true },
    });

    expect(members).toEqual([{ userId: user.id, role: "viewer" }]);
  });

  it("creates folders and files inside a project", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
      folderId: folder.id,
    });

    const found = await testDb.file.findUnique({
      where: { id: file.id },
      select: { folderId: true, projectId: true, type: true },
    });

    expect(found).toEqual({
      folderId: folder.id,
      projectId: project.id,
      type: "canvas",
    });
  });

  // Isolation guarantee that wave 4's parallelism depends on.
  it("scopes each workspace independently", async () => {
    const user = await makeUser();
    const wsA = await makeWorkspace();
    const wsB = await makeWorkspace();
    await makeProject({ workspaceId: wsA.id, createdById: user.id });

    expect(await testDb.project.count({ where: { workspaceId: wsA.id } })).toBe(
      1,
    );
    expect(await testDb.project.count({ where: { workspaceId: wsB.id } })).toBe(
      0,
    );
  });
});
