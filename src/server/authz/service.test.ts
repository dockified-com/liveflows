import { afterAll, describe, expect, it, vi } from "vitest";
import { testDb } from "./test-support/db";
import {
  makeFile,
  makeFolder,
  makeProject,
  makeProjectMember,
  makeUser,
  makeWorkspace,
} from "./test-support/factories";

// The service imports the app db singleton, which throws without
// DATABASE_URL. Point it at the test database.
vi.mock("../db", async () => {
  const { testDb } = await import("./test-support/db");
  return { db: testDb };
});

const {
  requireFilePermission,
  requireFolderPermission,
  requireProjectPermission,
} = await import("./service");
const { ForbiddenError, NotFoundError } = await import("../dal/errors");

function principal(
  userId: string,
  workspaceId: string,
  orgRole = "org:member",
) {
  return { userId, workspaceId, orgRole, source: { type: "user" } as const };
}

// Top level, NOT inside a describe. An afterAll registered inside a describe
// runs when that block finishes, which would disconnect the client before the
// later describes — and before the blocks task-07 appends to this file.
afterAll(async () => {
  await testDb.$disconnect();
});

describe("requireProjectPermission — workspace-visible projects", () => {
  it("allows an org member to read", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
      name: "Backend Platform",
    });

    const result = await requireProjectPermission(
      principal(user.id, ws.id),
      project.id,
      "project.read",
    );

    expect(result.id).toBe(project.id);
    expect(result.name).toBe("Backend Platform");
    expect(result.visibility).toBe("workspace");
    expect(result.role).toBe("editor");
  });

  it("allows an org member to update", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });

    const result = await requireProjectPermission(
      principal(user.id, ws.id),
      project.id,
      "project.update",
    );

    expect(result.role).toBe("editor");
  });

  it("denies an editor project.delete with ForbiddenError", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });

    await expect(
      requireProjectPermission(
        principal(user.id, ws.id),
        project.id,
        "project.delete",
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it("denies an editor member.manage with ForbiddenError", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });

    await expect(
      requireProjectPermission(
        principal(user.id, ws.id),
        project.id,
        "member.manage",
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("requireProjectPermission — explicit member rows", () => {
  it("lets an explicit owner delete", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: user.id,
      role: "owner",
    });

    const result = await requireProjectPermission(
      principal(user.id, ws.id),
      project.id,
      "project.delete",
    );

    expect(result.role).toBe("owner");
  });

  it("denies a viewer a mutation even on a workspace-visible project", async () => {
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

    await expect(
      requireProjectPermission(
        principal(user.id, ws.id),
        project.id,
        "file.create",
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it("still lets a viewer read", async () => {
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

    const result = await requireProjectPermission(
      principal(user.id, ws.id),
      project.id,
      "project.read",
    );

    expect(result.role).toBe("viewer");
  });

  it("only consults the calling user's row", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: alice.id,
    });
    await makeProjectMember({
      projectId: project.id,
      userId: alice.id,
      role: "owner",
    });
    await makeProjectMember({
      projectId: project.id,
      userId: bob.id,
      role: "viewer",
    });

    const bobResult = await requireProjectPermission(
      principal(bob.id, ws.id),
      project.id,
      "project.read",
    );

    expect(bobResult.role).toBe("viewer");
  });
});

describe("requireProjectPermission — private projects", () => {
  it("hides a private project from a non-member with NotFoundError", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });

    await expect(
      requireProjectPermission(
        principal(outsider.id, ws.id),
        project.id,
        "project.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("grants access to an explicit member", async () => {
    const owner = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    await makeProjectMember({
      projectId: project.id,
      userId: owner.id,
      role: "owner",
    });

    const result = await requireProjectPermission(
      principal(owner.id, ws.id),
      project.id,
      "project.delete",
    );

    expect(result.role).toBe("owner");
  });
});

describe("requireProjectPermission — org admin floor", () => {
  it("lets an admin reach a private project they are not a member of", async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });

    const result = await requireProjectPermission(
      principal(admin.id, ws.id, "org:admin"),
      project.id,
      "project.delete",
    );

    expect(result.role).toBe("owner");
  });

  it("resolves an admin as owner even with an explicit viewer row", async () => {
    const admin = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: admin.id,
      visibility: "private",
    });
    await makeProjectMember({
      projectId: project.id,
      userId: admin.id,
      role: "viewer",
    });

    const result = await requireProjectPermission(
      principal(admin.id, ws.id, "org:admin"),
      project.id,
      "member.manage",
    );

    expect(result.role).toBe("owner");
  });
});

describe("requireProjectPermission — tenant isolation (AC-7)", () => {
  it("throws NotFoundError for a project in another workspace", async () => {
    const user = await makeUser();
    const ownWs = await makeWorkspace();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: user.id,
    });

    await expect(
      requireProjectPermission(
        principal(user.id, ownWs.id),
        project.id,
        "project.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("does not leak existence via ForbiddenError across workspaces", async () => {
    const user = await makeUser();
    const ownWs = await makeWorkspace();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: user.id,
    });

    await expect(
      requireProjectPermission(
        principal(user.id, ownWs.id),
        project.id,
        "project.delete",
      ),
    ).rejects.not.toThrow(ForbiddenError);
  });

  it("throws NotFoundError for an id that does not exist", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();

    await expect(
      requireProjectPermission(
        principal(user.id, ws.id),
        "project_does_not_exist",
        "project.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("even an org admin cannot cross a workspace boundary", async () => {
    const admin = await makeUser();
    const ownWs = await makeWorkspace();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: admin.id,
    });

    await expect(
      requireProjectPermission(
        principal(admin.id, ownWs.id, "org:admin"),
        project.id,
        "project.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("requireFilePermission", () => {
  it("lets an editor update a file in a workspace-visible project", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
      name: "architecture",
    });

    const result = await requireFilePermission(
      principal(user.id, ws.id),
      file.id,
      "file.update",
    );

    expect(result.id).toBe(file.id);
    expect(result.name).toBe("architecture");
    expect(result.projectId).toBe(project.id);
    expect(result.type).toBe("canvas");
    expect(result.role).toBe("editor");
  });

  it("reports the containing folder", async () => {
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

    const result = await requireFilePermission(
      principal(user.id, ws.id),
      file.id,
      "file.read",
    );

    expect(result.folderId).toBe(folder.id);
  });

  it("reports null for a file at the project root", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });

    const result = await requireFilePermission(
      principal(user.id, ws.id),
      file.id,
      "file.read",
    );

    expect(result.folderId).toBeNull();
  });

  it("lets a viewer read a file but not update it", async () => {
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
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });

    await expect(
      requireFilePermission(principal(user.id, ws.id), file.id, "file.read"),
    ).resolves.toMatchObject({ role: "viewer" });

    await expect(
      requireFilePermission(principal(user.id, ws.id), file.id, "file.update"),
    ).rejects.toThrow(ForbiddenError);
  });

  it("denies a viewer file.delete", async () => {
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
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });

    await expect(
      requireFilePermission(principal(user.id, ws.id), file.id, "file.delete"),
    ).rejects.toThrow(ForbiddenError);
  });

  it("hides a file in a private project from a non-member", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });

    await expect(
      requireFilePermission(
        principal(outsider.id, ws.id),
        file.id,
        "file.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("lets an org admin update a file in a private project", async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: owner.id,
    });

    const result = await requireFilePermission(
      principal(admin.id, ws.id, "org:admin"),
      file.id,
      "file.update",
    );

    expect(result.role).toBe("owner");
  });

  it("throws NotFoundError for a file in another workspace", async () => {
    const user = await makeUser();
    const ownWs = await makeWorkspace();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: user.id,
    });
    const file = await makeFile({
      projectId: project.id,
      createdById: user.id,
    });

    await expect(
      requireFilePermission(principal(user.id, ownWs.id), file.id, "file.read"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for an id that does not exist", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();

    await expect(
      requireFilePermission(
        principal(user.id, ws.id),
        "file_does_not_exist",
        "file.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("requireFolderPermission", () => {
  it("lets an editor update a folder", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id, name: "infra" });

    const result = await requireFolderPermission(
      principal(user.id, ws.id),
      folder.id,
      "folder.update",
    );

    expect(result.id).toBe(folder.id);
    expect(result.name).toBe("infra");
    expect(result.projectId).toBe(project.id);
    expect(result.parentId).toBeNull();
    expect(result.role).toBe("editor");
  });

  it("reports the parent folder for a nested folder", async () => {
    const user = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: user.id,
    });
    const parent = await makeFolder({ projectId: project.id });
    const child = await makeFolder({
      projectId: project.id,
      parentId: parent.id,
    });

    const result = await requireFolderPermission(
      principal(user.id, ws.id),
      child.id,
      "folder.read",
    );

    expect(result.parentId).toBe(parent.id);
  });

  it("denies a viewer folder.delete", async () => {
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
    const folder = await makeFolder({ projectId: project.id });

    await expect(
      requireFolderPermission(
        principal(user.id, ws.id),
        folder.id,
        "folder.delete",
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it("still lets a viewer read a folder", async () => {
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
    const folder = await makeFolder({ projectId: project.id });

    const result = await requireFolderPermission(
      principal(user.id, ws.id),
      folder.id,
      "folder.read",
    );

    expect(result.role).toBe("viewer");
  });

  it("hides a folder in a private project from a non-member", async () => {
    const owner = await makeUser();
    const outsider = await makeUser();
    const ws = await makeWorkspace();
    const project = await makeProject({
      workspaceId: ws.id,
      createdById: owner.id,
      visibility: "private",
    });
    const folder = await makeFolder({ projectId: project.id });

    await expect(
      requireFolderPermission(
        principal(outsider.id, ws.id),
        folder.id,
        "folder.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError for a folder in another workspace", async () => {
    const user = await makeUser();
    const ownWs = await makeWorkspace();
    const otherWs = await makeWorkspace();
    const project = await makeProject({
      workspaceId: otherWs.id,
      createdById: user.id,
    });
    const folder = await makeFolder({ projectId: project.id });

    await expect(
      requireFolderPermission(
        principal(user.id, ownWs.id),
        folder.id,
        "folder.read",
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
