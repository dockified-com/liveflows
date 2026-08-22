import { describe, expect, it } from "vitest";
import {
  can,
  isProjectRole,
  type ProjectPermission,
  permissionsForRole,
} from "./permissions";

const ALL_PERMISSIONS: ProjectPermission[] = [
  "project.read",
  "project.update",
  "project.delete",
  "member.read",
  "member.manage",
  "folder.read",
  "folder.create",
  "folder.update",
  "folder.delete",
  "file.read",
  "file.create",
  "file.update",
  "file.delete",
];

describe("can — owner", () => {
  it("grants every permission", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(can("owner", permission), permission).toBe(true);
    }
  });
});

describe("can — editor", () => {
  it("can rename a project but not delete it", () => {
    expect(can("editor", "project.update")).toBe(true);
    expect(can("editor", "project.delete")).toBe(false);
  });

  it("can read members but not manage them", () => {
    expect(can("editor", "member.read")).toBe(true);
    expect(can("editor", "member.manage")).toBe(false);
  });

  it("has full file write access", () => {
    expect(can("editor", "file.create")).toBe(true);
    expect(can("editor", "file.update")).toBe(true);
    expect(can("editor", "file.delete")).toBe(true);
  });

  it("has full folder write access", () => {
    expect(can("editor", "folder.create")).toBe(true);
    expect(can("editor", "folder.update")).toBe(true);
    expect(can("editor", "folder.delete")).toBe(true);
  });
});

describe("can — viewer", () => {
  it("can read every resource family", () => {
    expect(can("viewer", "project.read")).toBe(true);
    expect(can("viewer", "member.read")).toBe(true);
    expect(can("viewer", "folder.read")).toBe(true);
    expect(can("viewer", "file.read")).toBe(true);
  });

  it("is denied every mutation", () => {
    const mutations: ProjectPermission[] = [
      "project.update",
      "project.delete",
      "member.manage",
      "folder.create",
      "folder.update",
      "folder.delete",
      "file.create",
      "file.update",
      "file.delete",
    ];
    for (const permission of mutations) {
      expect(can("viewer", permission), permission).toBe(false);
    }
  });
});

describe("permissionsForRole", () => {
  it("returns all 13 for an owner", () => {
    expect(permissionsForRole("owner")).toHaveLength(13);
  });

  it("returns 11 for an editor", () => {
    expect(permissionsForRole("editor")).toHaveLength(11);
  });

  it("returns exactly the four reads for a viewer", () => {
    expect(permissionsForRole("viewer")).toEqual([
      "project.read",
      "member.read",
      "folder.read",
      "file.read",
    ]);
  });
});

describe("isProjectRole", () => {
  it("accepts the three known roles", () => {
    expect(isProjectRole("owner")).toBe(true);
    expect(isProjectRole("editor")).toBe(true);
    expect(isProjectRole("viewer")).toBe(true);
  });

  it("rejects unknown, empty, and wrongly-cased values", () => {
    expect(isProjectRole("admin")).toBe(false);
    expect(isProjectRole("")).toBe(false);
    expect(isProjectRole("Owner")).toBe(false);
    expect(isProjectRole("org:admin")).toBe(false);
  });
});
