import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @clerk/nextjs/server
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock next/navigation — redirect() and notFound() throw like the real ones
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
    workspace: {
      upsert: vi.fn(),
    },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { db } from "../../db";
import { UnauthorizedError } from "../errors";
import { requireWorkspace, requireWorkspaceByOrgId } from "../workspaces";

const mockAuth = vi.mocked(auth);
const mockUpsert = vi.mocked(db.workspace.upsert);

describe("requireWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /sign-in when not authenticated", async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: false } as any);

    await expect(requireWorkspace("my-org")).rejects.toThrow(
      "REDIRECT:/sign-in",
    );
  });

  it("redirects to /sign-in when no orgId", async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: true, orgId: null } as any);

    await expect(requireWorkspace("my-org")).rejects.toThrow(
      "REDIRECT:/sign-in",
    );
  });

  it("redirects to correct slug when session orgSlug differs from URL slug", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_123",
      orgId: "org_123",
      orgSlug: "real-org",
    } as any);

    await expect(requireWorkspace("wrong-slug")).rejects.toThrow(
      "REDIRECT:/w/real-org",
    );
  });

  it("user in a DIFFERENT workspace receives redirect (becomes NotFound), never Forbidden", async () => {
    // Simulates a user whose session org is "org-a" trying to access "/w/org-b"
    // They should be redirected, not told the resource exists with a 403
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_456",
      orgId: "org_a",
      orgSlug: "org-a",
    } as any);

    await expect(requireWorkspace("org-b")).rejects.toThrow(
      "REDIRECT:/w/org-a",
    );
  });

  it("lazy-upserts and returns workspace when session matches", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_123",
      orgId: "org_123",
      orgSlug: "my-org",
    } as any);

    mockUpsert.mockResolvedValue({ id: "ws_1", slug: "my-org" } as any);

    const result = await requireWorkspace("my-org");

    expect(result).toEqual({ id: "ws_1", slug: "my-org" });
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { clerkOrgId: "org_123" },
      update: {},
      create: { clerkOrgId: "org_123", name: "my-org", slug: "my-org" },
      select: { id: true, slug: true },
    });
  });
});

describe("requireWorkspaceByOrgId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws UnauthorizedError when not authenticated", async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: false } as any);

    await expect(requireWorkspaceByOrgId("org_123")).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("throws UnauthorizedError when session orgId does not match", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      orgId: "org_other",
    } as any);

    await expect(requireWorkspaceByOrgId("org_123")).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("throws UnauthorizedError when session has no orgId", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      orgId: null,
    } as any);

    await expect(requireWorkspaceByOrgId("org_123")).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("lazy-upserts and returns workspace on match", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      orgId: "org_123",
    } as any);

    mockUpsert.mockResolvedValue({ id: "ws_1", slug: "my-org" } as any);

    const result = await requireWorkspaceByOrgId("org_123");
    expect(result).toEqual({ id: "ws_1", slug: "my-org" });
  });
});
