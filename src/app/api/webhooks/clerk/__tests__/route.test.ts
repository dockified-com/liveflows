import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — boundary only: Clerk verification and Prisma
// ---------------------------------------------------------------------------

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {
    processedWebhook: { create: vi.fn() },
    user: { upsert: vi.fn(), delete: vi.fn() },
    workspace: { upsert: vi.fn(), findUnique: vi.fn() },
    workspaceMember: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { db } from "@/server/db";
import { POST } from "../route";

const mockVerify = vi.mocked(verifyWebhook);
const mockProcessedCreate = vi.mocked(db.processedWebhook.create);
const mockUserUpsert = vi.mocked(db.user.upsert);
const mockUserDelete = vi.mocked(db.user.delete);
const mockWsUpsert = vi.mocked(db.workspace.upsert);
const mockWsFindUnique = vi.mocked(db.workspace.findUnique);
const mockMemberUpsert = vi.mocked(db.workspaceMember.upsert);
const mockMemberDelete = vi.mocked(db.workspaceMember.deleteMany);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: object = {}, svixId = "msg_test123"): NextRequest {
  return new NextRequest("http://localhost:3000/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": svixId,
      "svix-timestamp": "1234567890",
      "svix-signature": "v1,test",
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessedCreate.mockResolvedValue({} as never);
  });

  // =========================================================================
  // SECURITY: Signature verification
  // =========================================================================

  describe("signature verification", () => {
    it("returns 400 when signature verification fails (invalid signature)", async () => {
      mockVerify.mockRejectedValue(new Error("Invalid signature"));
      const req = makeRequest();
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Bad signature");
      // No DB mutations happen
      expect(mockProcessedCreate).not.toHaveBeenCalled();
      expect(mockUserUpsert).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // IDEMPOTENCY: Duplicate delivery
  // =========================================================================

  describe("idempotency", () => {
    it("returns 200 and skips handler when svix-id was already processed", async () => {
      mockVerify.mockResolvedValue({
        type: "user.created",
        data: { id: "u1" },
      } as never);
      // Simulate unique constraint violation
      mockProcessedCreate.mockRejectedValue(
        new Error("Unique constraint failed on the fields: (`id`)"),
      );

      const req = makeRequest({}, "msg_duplicate");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Already processed");
      // Handler was NOT called — state mutated only once
      expect(mockUserUpsert).not.toHaveBeenCalled();
    });

    it("processes the event on first delivery (processedWebhook.create succeeds)", async () => {
      mockVerify.mockResolvedValue({
        type: "user.created",
        data: {
          id: "user_first",
          email_addresses: [{ id: "ea_1", email_address: "a@b.com" }],
          primary_email_address_id: "ea_1",
          first_name: "A",
          last_name: null,
          image_url: null,
        },
      } as never);

      const req = makeRequest({}, "msg_first");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockProcessedCreate).toHaveBeenCalledWith({
        data: { id: "msg_first", source: "clerk" },
      });
      expect(mockUserUpsert).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // user.created / user.updated
  // =========================================================================

  describe("user.created / user.updated", () => {
    it("upserts user with correct fields on user.created", async () => {
      mockVerify.mockResolvedValue({
        type: "user.created",
        data: {
          id: "user_abc",
          email_addresses: [{ id: "ea_1", email_address: "test@example.com" }],
          primary_email_address_id: "ea_1",
          first_name: "Test",
          last_name: "User",
          image_url: "https://img.example.com/avatar.png",
        },
      } as never);

      const req = makeRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockUserUpsert).toHaveBeenCalledWith({
        where: { id: "user_abc" },
        update: {
          email: "test@example.com",
          name: "Test User",
          avatarUrl: "https://img.example.com/avatar.png",
        },
        create: {
          id: "user_abc",
          email: "test@example.com",
          name: "Test User",
          avatarUrl: "https://img.example.com/avatar.png",
        },
      });
    });

    it("upserts user on user.updated (same logic)", async () => {
      mockVerify.mockResolvedValue({
        type: "user.updated",
        data: {
          id: "user_abc",
          email_addresses: [{ id: "ea_2", email_address: "new@example.com" }],
          primary_email_address_id: "ea_2",
          first_name: "Updated",
          last_name: null,
          image_url: null,
        },
      } as never);

      const req = makeRequest({}, "msg_upd1");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockUserUpsert).toHaveBeenCalledWith({
        where: { id: "user_abc" },
        update: {
          email: "new@example.com",
          name: "Updated",
          avatarUrl: null,
        },
        create: {
          id: "user_abc",
          email: "new@example.com",
          name: "Updated",
          avatarUrl: null,
        },
      });
    });
  });

  // =========================================================================
  // user.deleted
  // =========================================================================

  describe("user.deleted", () => {
    it("deletes user by id", async () => {
      mockVerify.mockResolvedValue({
        type: "user.deleted",
        data: { id: "user_del" },
      } as never);
      mockUserDelete.mockResolvedValue({} as never);

      const req = makeRequest({}, "msg_del1");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockUserDelete).toHaveBeenCalledWith({
        where: { id: "user_del" },
      });
    });

    it("is idempotent when user already gone (delete throws)", async () => {
      mockVerify.mockResolvedValue({
        type: "user.deleted",
        data: { id: "user_gone" },
      } as never);
      mockUserDelete.mockRejectedValue(new Error("Record not found"));

      const req = makeRequest({}, "msg_del2");
      const res = await POST(req);

      // Should still return 200, error is swallowed
      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // organization.created / organization.updated
  // =========================================================================

  describe("organization.created / organization.updated", () => {
    it("upserts workspace on organization.created", async () => {
      mockVerify.mockResolvedValue({
        type: "organization.created",
        data: { id: "org_xyz", name: "My Org", slug: "my-org" },
      } as never);

      const req = makeRequest({}, "msg_org1");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockWsUpsert).toHaveBeenCalledWith({
        where: { clerkOrgId: "org_xyz" },
        update: { name: "My Org", slug: "my-org" },
        create: { clerkOrgId: "org_xyz", name: "My Org", slug: "my-org" },
      });
    });

    it("upserts workspace on organization.updated", async () => {
      mockVerify.mockResolvedValue({
        type: "organization.updated",
        data: { id: "org_xyz", name: "Renamed Org", slug: "renamed-org" },
      } as never);

      const req = makeRequest({}, "msg_org2");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockWsUpsert).toHaveBeenCalledWith({
        where: { clerkOrgId: "org_xyz" },
        update: { name: "Renamed Org", slug: "renamed-org" },
        create: {
          clerkOrgId: "org_xyz",
          name: "Renamed Org",
          slug: "renamed-org",
        },
      });
    });
  });

  // =========================================================================
  // organizationMembership.created / updated
  // =========================================================================

  describe("organizationMembership.created / updated", () => {
    it("upserts membership with opaque role string on membership.created", async () => {
      mockVerify.mockResolvedValue({
        type: "organizationMembership.created",
        data: {
          organization: { id: "org_xyz" },
          public_user_data: { user_id: "user_abc" },
          role: "org:custom_editor",
        },
      } as never);

      mockWsUpsert.mockResolvedValue({ id: "ws_1" } as never);
      mockUserUpsert.mockResolvedValue({} as never);

      const req = makeRequest({}, "msg_mem1");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockMemberUpsert).toHaveBeenCalledWith({
        where: {
          userId_workspaceId: { userId: "user_abc", workspaceId: "ws_1" },
        },
        update: { role: "org:custom_editor" },
        create: {
          userId: "user_abc",
          workspaceId: "ws_1",
          role: "org:custom_editor",
        },
      });
    });

    it("stores unknown role strings as-is (roles are opaque)", async () => {
      mockVerify.mockResolvedValue({
        type: "organizationMembership.updated",
        data: {
          organization: { id: "org_xyz" },
          public_user_data: { user_id: "user_abc" },
          role: "org:some_future_role_2027",
        },
      } as never);

      mockWsUpsert.mockResolvedValue({ id: "ws_1" } as never);
      mockUserUpsert.mockResolvedValue({} as never);

      const req = makeRequest({}, "msg_mem2");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockMemberUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { role: "org:some_future_role_2027" },
          create: expect.objectContaining({
            role: "org:some_future_role_2027",
          }),
        }),
      );
    });

    it("creates placeholder workspace and user if they don't exist yet", async () => {
      mockVerify.mockResolvedValue({
        type: "organizationMembership.created",
        data: {
          organization: { id: "org_new" },
          public_user_data: { user_id: "user_new" },
          role: "org:member",
        },
      } as never);

      mockWsUpsert.mockResolvedValue({ id: "ws_new" } as never);
      mockUserUpsert.mockResolvedValue({} as never);

      const req = makeRequest({}, "msg_mem3");
      await POST(req);

      // Workspace upsert creates placeholder if not exists
      expect(mockWsUpsert).toHaveBeenCalledWith({
        where: { clerkOrgId: "org_new" },
        update: {},
        create: { clerkOrgId: "org_new", name: "org_new", slug: "org_new" },
        select: { id: true },
      });

      // User upsert creates placeholder if not exists
      expect(mockUserUpsert).toHaveBeenCalledWith({
        where: { id: "user_new" },
        update: {},
        create: { id: "user_new", email: "" },
      });
    });
  });

  // =========================================================================
  // organizationMembership.deleted
  // =========================================================================

  describe("organizationMembership.deleted", () => {
    it("deletes membership when workspace exists", async () => {
      mockVerify.mockResolvedValue({
        type: "organizationMembership.deleted",
        data: {
          organization: { id: "org_xyz" },
          public_user_data: { user_id: "user_abc" },
        },
      } as never);

      mockWsFindUnique.mockResolvedValue({ id: "ws_1" } as never);

      const req = makeRequest({}, "msg_memdel1");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockMemberDelete).toHaveBeenCalledWith({
        where: { userId: "user_abc", workspaceId: "ws_1" },
      });
    });

    it("no-ops gracefully when workspace does not exist", async () => {
      mockVerify.mockResolvedValue({
        type: "organizationMembership.deleted",
        data: {
          organization: { id: "org_gone" },
          public_user_data: { user_id: "user_abc" },
        },
      } as never);

      mockWsFindUnique.mockResolvedValue(null);

      const req = makeRequest({}, "msg_memdel2");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockMemberDelete).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Unknown events
  // =========================================================================

  describe("unknown events", () => {
    it("returns 200 for unhandled event types (acknowledges to prevent retries)", async () => {
      mockVerify.mockResolvedValue({
        type: "session.created",
        data: {},
      } as never);

      const req = makeRequest({}, "msg_unknown");
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("OK");
    });
  });
});
