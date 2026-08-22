import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "../../authz/test-support/db";
import {
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

const { createProject, deleteProject, getProject } = await import(
  "../projects"
);
const { ForbiddenError } = await import("../errors");

/**
 * requireWorkspace compares auth().orgSlug against the slug argument and
 * upserts by clerkOrgId, so the mocked session must agree with the workspace
 * row the factory created.
 */
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

describe("projects DAL authorization", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("returns a workspace-visible project to an org member", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
      name: "Backend Platform",
    });
    signIn(user.id, ws);

    const result = await getProject(ws.slug, project.id);

    expect(result.name).toBe("Backend Platform");
  });

  it("404s a private project for a non-member", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    signIn(outsider.id, ws);

    await expect(getProject(ws.slug, project.id)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("404s a project in another workspace", async () => {
    const user = await makeUser();
    const ownWs = await workspaceWithOrg();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: user.id,
    });
    signIn(user.id, ownWs);

    await expect(getProject(ownWs.slug, project.id)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("refuses deletion by an editor with ForbiddenError", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    signIn(user.id, ws);

    await expect(deleteProject(ws.slug, project.id)).rejects.toThrow(
      ForbiddenError,
    );

    // Scoped count — never count across the whole table.
    expect(await testDb.project.count({ where: { workspaceId: ws.id } })).toBe(
      1,
    );
  });

  it("allows deletion by an explicit owner", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "owner",
    });
    signIn(user.id, ws);

    await deleteProject(ws.slug, project.id);

    expect(await testDb.project.count({ where: { workspaceId: ws.id } })).toBe(
      0,
    );
  });

  it("allows deletion by an org admin who is not a member", async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    const ws = await workspaceWithOrg();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    signIn(admin.id, ws, "org:admin");

    await deleteProject(ws.slug, project.id);

    expect(await testDb.project.count({ where: { workspaceId: ws.id } })).toBe(
      0,
    );
  });

  it("gives the creator an explicit owner row", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    signIn(user.id, ws);

    const project = await createProject(ws.slug, "New Project");

    const members = await testDb.projectMember.findMany({
      where: { projectId: project.id },
      select: { userId: true, role: true },
    });

    expect(members).toEqual([{ userId: user.id, role: "owner" }]);
  });

  it("lets the creator delete their own project immediately", async () => {
    const user = await makeUser();
    const ws = await workspaceWithOrg();
    signIn(user.id, ws);

    const project = await createProject(ws.slug, "Disposable");
    await deleteProject(ws.slug, project.id);

    expect(await testDb.project.count({ where: { workspaceId: ws.id } })).toBe(
      0,
    );
  });
});
