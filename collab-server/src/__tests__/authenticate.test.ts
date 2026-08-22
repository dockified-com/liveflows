import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockVerifyToken, mockFileFindUnique, mockWorkspaceMemberFindFirst } =
  vi.hoisted(() => ({
    mockVerifyToken: vi.fn(),
    mockFileFindUnique: vi.fn(),
    mockWorkspaceMemberFindFirst: vi.fn(),
  }));

// Mock @clerk/backend
vi.mock("@clerk/backend", () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

// Mock db
vi.mock("../db.js", () => ({
  db: {
    file: { findUnique: (...args: unknown[]) => mockFileFindUnique(...args) },
    workspaceMember: {
      findFirst: (...args: unknown[]) => mockWorkspaceMemberFindFirst(...args),
    },
  },
}));

import { onAuthenticate } from "../authenticate.js";

describe("onAuthenticate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when token is invalid or verification throws (AC-4)", async () => {
    mockVerifyToken.mockRejectedValue(new Error("bad token"));

    await expect(
      onAuthenticate({ token: "invalid_token", documentName: "file_123" }),
    ).rejects.toThrow("Unauthorized: invalid token");
  });

  it("rejects when token claims do not have a sub (AC-4)", async () => {
    mockVerifyToken.mockResolvedValue({});

    await expect(
      onAuthenticate({ token: "token_no_sub", documentName: "file_123" }),
    ).rejects.toThrow("Unauthorized: no sub claim");
  });

  it("rejects when file does not exist", async () => {
    mockVerifyToken.mockResolvedValue({ sub: "user_123" });
    mockFileFindUnique.mockResolvedValue(null);

    await expect(
      onAuthenticate({ token: "valid_token", documentName: "file_missing" }),
    ).rejects.toThrow("Forbidden: not a workspace member");
  });

  it("rejects when user is not a member of the file's workspace (AC-5)", async () => {
    mockVerifyToken.mockResolvedValue({ sub: "user_123" });
    mockFileFindUnique.mockResolvedValue({
      project: { workspaceId: "ws_456" },
    });
    mockWorkspaceMemberFindFirst.mockResolvedValue(null);

    await expect(
      onAuthenticate({ token: "valid_token", documentName: "file_123" }),
    ).rejects.toThrow("Forbidden: not a workspace member");
  });

  it("accepts when user is a workspace member", async () => {
    mockVerifyToken.mockResolvedValue({ sub: "user_123" });
    mockFileFindUnique.mockResolvedValue({
      project: { workspaceId: "ws_456" },
    });
    mockWorkspaceMemberFindFirst.mockResolvedValue({ id: "member_789" });

    const authContext = await onAuthenticate({
      token: "valid_token",
      documentName: "file_123",
    });

    expect(authContext).toEqual({
      userId: "user_123",
      readOnly: false,
    });
  });
});
