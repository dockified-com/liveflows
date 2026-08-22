import { auth } from "@clerk/nextjs/server";
import { UnauthorizedError } from "../dal/errors";

export const ORG_MEMBER_ROLE = "org:member";

/**
 * Who is asking. Built at the edge, consumed by the authorization service.
 *
 * Every field is server-resolved. Nothing here may originate from client input
 * or the URL — the session is the authority, the URL slug is only a label.
 *
 * The `mcp` variant of `source` exists so phase 5 can add a token adapter
 * without changing this type. Only `user` is constructed today.
 */
export type Principal = {
  userId: string;
  workspaceId: string;
  orgRole: string;
  source: { type: "user" } | { type: "mcp"; tokenId: string };
};

/**
 * Builds a principal for a browser request.
 *
 * orgRole comes from the live Clerk session rather than WorkspaceMember, so it
 * does not depend on webhook delivery. This matches requireWorkspace, which
 * also authorizes off the session alone.
 *
 * Callers pass workspaceId because requireWorkspace has already resolved and
 * verified it against the session's active organization — re-deriving it here
 * would duplicate that logic and risk diverging from it.
 */
export async function principalFromSession(
  workspaceId: string,
): Promise<Principal> {
  const { isAuthenticated, userId, orgId, orgRole } = await auth();

  if (!isAuthenticated || !userId || !orgId) {
    throw new UnauthorizedError();
  }

  return {
    userId,
    workspaceId,
    orgRole: orgRole ?? ORG_MEMBER_ROLE,
    source: { type: "user" },
  };
}
