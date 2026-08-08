import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for POST /api/liveblocks-auth
 *
 * Strategy: mock external boundaries (Clerk auth, DAL, Liveblocks client)
 * but call the real route handler. This ensures the handler's logic is
 * tested — a deleted handler would cause import failure, not passing tests.
 */

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/dal/workspaces", () => ({
  requireWorkspaceByOrgId: vi.fn(),
}));

vi.mock("@/server/liveblocks", () => ({
  liveblocks: {
    identifyUser: vi.fn(),
  },
}));

import { auth } from "@clerk/nextjs/server";
import { requireWorkspaceByOrgId } from "@/server/dal/workspaces";
import { liveblocks } from "@/server/liveblocks";
import { POST } from "./route";

function makeRequest() {
  return new Request("http://localhost:3000/api/liveblocks-auth", {
    method: "POST",
    body: JSON.stringify({ room: "project_abc" }),
  });
}

describe("POST /api/liveblocks-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated (no userId)", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: null,
      orgId: null,
    } as never);

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(requireWorkspaceByOrgId).not.toHaveBeenCalled();
    expect(liveblocks.identifyUser).not.toHaveBeenCalled();
  });

  it("returns 401 when no active organization", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_123",
      orgId: undefined,
    } as never);

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(requireWorkspaceByOrgId).not.toHaveBeenCalled();
  });

  it("refuses token for a workspace the user does not belong to (cross-workspace)", async () => {
    // User is authenticated with org_evil, but that org has no workspace row.
    // The DAL's requireWorkspaceByOrgId throws — proving authorization refusal.
    vi.mocked(auth).mockResolvedValue({
      userId: "user_attacker",
      orgId: "org_evil_no_workspace",
    } as never);

    vi.mocked(requireWorkspaceByOrgId).mockRejectedValue(
      new Error("No Workspace found"),
    );

    const res = await POST(makeRequest());

    // The handler must NOT mint a token
    expect(liveblocks.identifyUser).not.toHaveBeenCalled();
    // The DAL threw → handler catches and returns 403 Forbidden
    expect(res.status).toBe(403);
  });

  it("returns identifyUser response on successful auth + authorization", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: "user_123",
      orgId: "org_acme",
    } as never);

    vi.mocked(requireWorkspaceByOrgId).mockResolvedValue({
      id: "ws_acme_id",
      slug: "acme",
    });

    vi.mocked(liveblocks.identifyUser).mockResolvedValue({
      status: 200,
      body: '{"token":"eyJ..."}',
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('{"token":"eyJ..."}');
    expect(res.headers.get("Content-Type")).toBe("application/json");

    // Verify correct arguments to identifyUser
    expect(liveblocks.identifyUser).toHaveBeenCalledWith(
      {
        userId: "user_123",
        groupIds: ["ws_acme_id"],
        organizationId: "org_acme",
      },
      { userInfo: {} },
    );
  });

  it("passes workspace.id (not orgId) as the groupId", async () => {
    // This is important: the groupId is the workspace's internal ID,
    // not the Clerk org ID. Room permissions are assigned per workspace ID.
    vi.mocked(auth).mockResolvedValue({
      userId: "user_456",
      orgId: "org_different",
    } as never);

    vi.mocked(requireWorkspaceByOrgId).mockResolvedValue({
      id: "ws_internal_789",
      slug: "my-ws",
    });

    vi.mocked(liveblocks.identifyUser).mockResolvedValue({
      status: 200,
      body: '{"token":"abc"}',
    });

    await POST(makeRequest());

    expect(liveblocks.identifyUser).toHaveBeenCalledWith(
      expect.objectContaining({
        groupIds: ["ws_internal_789"],
        organizationId: "org_different",
      }),
      expect.anything(),
    );
  });
});
