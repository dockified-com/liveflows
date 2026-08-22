import { afterAll, describe, expect, it, vi } from "vitest";
import { testDb } from "./test-support/db";
import {
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

const { requireProjectPermission } = await import("./service");
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
