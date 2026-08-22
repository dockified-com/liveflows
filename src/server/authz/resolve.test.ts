import { describe, expect, it } from "vitest";
import { type ProjectAuthzShape, resolveEffectiveRole } from "./resolve";

const member = { userId: "user_1", orgRole: "org:member" };
const admin = { userId: "user_1", orgRole: "org:admin" };

function project(
  visibility: string,
  members: { role: string }[] = [],
): ProjectAuthzShape {
  return { visibility, members };
}

describe("resolveEffectiveRole — workspace-visible projects", () => {
  it("grants editor to an org member with no explicit row", () => {
    expect(resolveEffectiveRole(member, project("workspace"))).toBe("editor");
  });

  it("lets an explicit owner row upgrade a member", () => {
    expect(
      resolveEffectiveRole(member, project("workspace", [{ role: "owner" }])),
    ).toBe("owner");
  });

  it("lets an explicit viewer row downgrade a member", () => {
    expect(
      resolveEffectiveRole(member, project("workspace", [{ role: "viewer" }])),
    ).toBe("viewer");
  });

  it("keeps an explicit editor row as editor", () => {
    expect(
      resolveEffectiveRole(member, project("workspace", [{ role: "editor" }])),
    ).toBe("editor");
  });
});

describe("resolveEffectiveRole — private projects", () => {
  it("denies an org member with no explicit row", () => {
    expect(resolveEffectiveRole(member, project("private"))).toBeNull();
  });

  it("grants the explicit role when a row exists", () => {
    expect(
      resolveEffectiveRole(member, project("private", [{ role: "viewer" }])),
    ).toBe("viewer");
  });

  it("grants owner when an explicit owner row exists", () => {
    expect(
      resolveEffectiveRole(member, project("private", [{ role: "owner" }])),
    ).toBe("owner");
  });
});

describe("resolveEffectiveRole — org admin floor", () => {
  it("grants owner on a workspace-visible project", () => {
    expect(resolveEffectiveRole(admin, project("workspace"))).toBe("owner");
  });

  it("grants owner on a private project with no row", () => {
    expect(resolveEffectiveRole(admin, project("private"))).toBe("owner");
  });

  // THE FLOOR PROPERTY. An explicit lower row must NOT reduce an admin.
  // Without this, downgrading the last admin on a private project is
  // unrecoverable in-app: a viewer holds neither member.manage nor
  // project.update, so they cannot restore access or flip visibility back.
  it("grants owner even when an explicit viewer row exists", () => {
    expect(
      resolveEffectiveRole(admin, project("private", [{ role: "viewer" }])),
    ).toBe("owner");
  });

  it("grants owner even when an explicit editor row exists", () => {
    expect(
      resolveEffectiveRole(admin, project("workspace", [{ role: "editor" }])),
    ).toBe("owner");
  });
});

describe("resolveEffectiveRole — defensive cases", () => {
  it("treats an unrecognised stored role as no access", () => {
    expect(
      resolveEffectiveRole(
        member,
        project("workspace", [{ role: "org:some_future_role" }]),
      ),
    ).toBeNull();
  });

  it("treats an unrecognised visibility as private", () => {
    expect(resolveEffectiveRole(member, project("team"))).toBeNull();
  });

  it("treats an empty visibility as private", () => {
    expect(resolveEffectiveRole(member, project(""))).toBeNull();
  });

  it("treats an unrecognised org role as a plain member", () => {
    expect(
      resolveEffectiveRole(
        { userId: "user_1", orgRole: "org:billing_manager" },
        project("workspace"),
      ),
    ).toBe("editor");
  });

  it("ignores rows beyond the first (queries filter to one user)", () => {
    expect(
      resolveEffectiveRole(
        member,
        project("workspace", [{ role: "viewer" }, { role: "owner" }]),
      ),
    ).toBe("viewer");
  });
});
