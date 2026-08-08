import { auth } from "@clerk/nextjs/server";
import { requireWorkspaceByOrgId } from "@/server/dal/workspaces";
import { liveblocks } from "@/server/liveblocks";

/**
 * POST /api/liveblocks-auth
 *
 * Issues a Liveblocks ID token for the currently authenticated user.
 * Authentication: Clerk session (enforced by proxy.ts for non-public routes).
 * Authorization: delegated to Charlie's DAL — requireWorkspaceByOrgId verifies
 * the user's active org maps to a workspace row, preventing cross-workspace access.
 *
 * ID tokens (not access tokens) are used because this is a multi-tenant app:
 * - Permissions are managed server-side via the Liveblocks dashboard/API
 * - The token carries identity (userId, groupIds, organizationId)
 * - Room-level permissions are resolved by Liveblocks at connection time
 */
export async function POST(_request: Request) {
  const session = await auth();

  if (!session.userId || !session.orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Authorization boundary: verify the org maps to an existing workspace.
  // Throws NotFound if the orgId doesn't correspond to any workspace —
  // this prevents a user from forging tokens for workspaces they don't belong to.
  let workspace: { id: string; slug: string };
  try {
    workspace = await requireWorkspaceByOrgId(session.orgId);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const { status, body } = await liveblocks.identifyUser(
    {
      userId: session.userId,
      groupIds: [workspace.id],
      organizationId: session.orgId,
    },
    { userInfo: {} },
  );

  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
