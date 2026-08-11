import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/dal/projects", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProject } from "@/server/dal/projects";
import { createProjectAction, deleteProjectAction } from "./actions";

const mockCreateProject = vi.mocked(createProject);
const mockRedirect = vi.mocked(redirect);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("createProjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if name is empty", async () => {
    const fd = new FormData();
    fd.set("name", "");
    await expect(createProjectAction("acme", fd)).rejects.toThrow(
      "Project name is required",
    );
  });

  it("throws if name exceeds 100 characters", async () => {
    const fd = new FormData();
    fd.set("name", "x".repeat(101));
    await expect(createProjectAction("acme", fd)).rejects.toThrow(
      "100 characters",
    );
  });

  it("calls createProject with trimmed name and redirects", async () => {
    mockCreateProject.mockResolvedValue({
      id: "p1",
      name: "Test Project",
      updatedAt: new Date(),
    });

    const fd = new FormData();
    fd.set("name", "  Test  ");
    await createProjectAction("acme", fd);

    expect(mockCreateProject).toHaveBeenCalledWith("acme", "Test");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/w/acme");
    expect(mockRedirect).toHaveBeenCalledWith("/w/acme/p/p1");
  });
});

describe("deleteProjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if projectId is empty", async () => {
    const fd = new FormData();
    fd.set("projectId", "");
    await expect(deleteProjectAction("acme", fd)).rejects.toThrow(
      "Project ID is required",
    );
  });

  it("calls deleteProject and revalidates", async () => {
    const { deleteProject } = await import("@/server/dal/projects");
    vi.mocked(deleteProject).mockResolvedValue(undefined);

    const fd = new FormData();
    fd.set("projectId", "p1");
    await deleteProjectAction("acme", fd);

    expect(deleteProject).toHaveBeenCalledWith("acme", "p1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/w/acme");
  });
});
