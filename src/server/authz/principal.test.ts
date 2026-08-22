import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => mockAuth() }));

const { ORG_MEMBER_ROLE, principalFromSession } = await import("./principal");
const { UnauthorizedError } = await import("../dal/errors");

describe("principalFromSession", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("builds a user principal from the session", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:admin",
    });

    const principal = await principalFromSession("ws_1");

    expect(principal).toEqual({
      userId: "user_1",
      workspaceId: "ws_1",
      orgRole: "org:admin",
      source: { type: "user" },
    });
  });

  it("defaults a missing orgRole to org:member", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: "org_1",
      orgRole: null,
    });

    const principal = await principalFromSession("ws_1");

    expect(principal.orgRole).toBe(ORG_MEMBER_ROLE);
    expect(principal.orgRole).toBe("org:member");
  });

  it("defaults an undefined orgRole to org:member", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: "org_1",
    });

    const principal = await principalFromSession("ws_1");

    expect(principal.orgRole).toBe("org:member");
  });

  it("passes the caller-supplied workspaceId through unchanged", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: "org_1",
      orgRole: "org:member",
    });

    const principal = await principalFromSession("ws_specific");

    expect(principal.workspaceId).toBe("ws_specific");
  });

  it("throws UnauthorizedError when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ isAuthenticated: false });

    await expect(principalFromSession("ws_1")).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("throws UnauthorizedError when there is no active organization", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user_1",
      orgId: null,
    });

    await expect(principalFromSession("ws_1")).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("throws UnauthorizedError when there is no userId", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: null,
      orgId: "org_1",
    });

    await expect(principalFromSession("ws_1")).rejects.toThrow(
      UnauthorizedError,
    );
  });
});
