/**
 * Hocuspocus onAuthenticate handler.
 *
 * Stage 1: verify Clerk token + require workspace membership.
 * Matches exactly what Liveblocks enforces today — no regression.
 *
 * Stage 2 (future): swap authorizeConnection to delegate to
 * authorizeRealtimeConnection(principal, fileId) once authz phase 5 lands.
 * The signature is identical; the swap is a one-file change.
 *
 * Security rules:
 * - Never trust the client-supplied role or fileId claims beyond the token.
 * - documentName = fileId, arrives from the client, MUST be authorized server-side.
 * - Throwing rejects the WebSocket connection (Hocuspocus contract).
 * - Never log tokens or secrets.
 */
import { verifyToken } from "@clerk/backend";
import { db } from "./db.js";

type Decision = "write" | "read" | "deny";

/**
 * Resolve workspace membership for a file.
 * Returns "write" if the user is a workspace member, "deny" otherwise.
 * Stage 2 will add "read" for viewers via authorizeRealtimeConnection.
 */
async function authorizeConnection(
  claims: {
    sub?: string;
    org_id?: string;
    orgId?: string;
    org_role?: string;
    orgRole?: string;
    org_slug?: string;
    orgSlug?: string;
  },
  documentName: string,
): Promise<Decision> {
  const userId = claims.sub;
  if (!userId) return "deny";

  const orgId = claims.org_id || claims.orgId;
  const orgSlug = claims.org_slug || claims.orgSlug;
  const orgRole = claims.org_role || claims.orgRole || "org:member";

  const normalizedId = documentName.startsWith("file_")
    ? documentName.slice(5)
    : documentName;

  // 1. Try findUnique by documentName or normalizedId
  let file = await db.file.findUnique({
    where: { id: documentName },
    select: {
      id: true,
      createdById: true,
      project: {
        select: {
          id: true,
          createdById: true,
          visibility: true,
          workspaceId: true,
          workspace: {
            select: {
              id: true,
              clerkOrgId: true,
              slug: true,
            },
          },
          members: {
            where: { userId },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!file && normalizedId !== documentName) {
    file = await db.file.findUnique({
      where: { id: normalizedId },
      select: {
        id: true,
        createdById: true,
        project: {
          select: {
            id: true,
            createdById: true,
            visibility: true,
            workspaceId: true,
            workspace: {
              select: {
                id: true,
                clerkOrgId: true,
                slug: true,
              },
            },
            members: {
              where: { userId },
              select: { role: true },
            },
          },
        },
      },
    });
  }

  // 2. Fallback to findFirst for roomId
  if (!file && typeof db.file.findFirst === "function") {
    file = await db.file.findFirst({
      where: {
        OR: [{ roomId: documentName }, { roomId: `file_${documentName}` }],
      },
      select: {
        id: true,
        createdById: true,
        project: {
          select: {
            id: true,
            createdById: true,
            visibility: true,
            workspaceId: true,
            workspace: {
              select: {
                id: true,
                clerkOrgId: true,
                slug: true,
              },
            },
            members: {
              where: { userId },
              select: { role: true },
            },
          },
        },
      },
    });
  }

  if (!file) {
    console.warn(
      `[collab:auth] File not found for doc: ${documentName} (user: ${userId})`,
    );
    return "deny";
  }

  const {
    workspaceId,
    workspace,
    visibility,
    members,
    createdById: projectCreatedById,
  } = file.project;

  // Check 1: Explicit WorkspaceMember DB row (if exists or test mock)
  const membership = await db.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { id: true },
  });
  if (membership) return "write";

  // Check 2: File or Project Creator
  if (file.createdById === userId || projectCreatedById === userId) {
    return "write";
  }

  // Check 3: Clerk Organization session match
  if (
    (orgId && workspace?.clerkOrgId && orgId === workspace.clerkOrgId) ||
    (orgSlug && workspace?.slug && orgSlug === workspace.slug)
  ) {
    if (orgRole === "org:admin") return "write";
    const explicitRole = members?.[0]?.role;
    if (explicitRole === "owner" || explicitRole === "editor") return "write";
    if (explicitRole === "viewer") return "read";
    if (visibility === "workspace") return "write";
  }

  console.warn(
    `[collab:auth] Membership check failed for user: ${userId}, ws: ${workspaceId}, orgId: ${orgId}`,
  );
  return "deny";
}

export interface AuthContext {
  userId: string;
  readOnly: boolean;
}

/**
 * Verifies the Clerk session token and resolves workspace authorization.
 * Throws on any failure — Hocuspocus will reject the connection.
 */
export async function onAuthenticate({
  token,
  documentName,
}: {
  token: string;
  documentName: string;
}): Promise<AuthContext> {
  let claims: { sub?: string } | null = null;

  try {
    claims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  } catch {
    throw new Error("Unauthorized: invalid token");
  }

  const userId = claims?.sub;
  if (!userId) throw new Error("Unauthorized: no sub claim");

  const decision = await authorizeConnection(claims, documentName);
  if (decision === "deny") throw new Error("Forbidden: not a workspace member");

  return { userId, readOnly: decision === "read" };
}
