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
/**
 * Resolve workspace membership for a file.
 * Returns "write" if the user is a workspace member, "deny" otherwise.
 * Stage 2 will add "read" for viewers via authorizeRealtimeConnection.
 */
async function authorizeConnection(userId, fileId) {
    // Resolve file → project → workspace
    const file = await db.file.findUnique({
        where: { id: fileId },
        select: {
            project: {
                select: {
                    workspaceId: true,
                },
            },
        },
    });
    if (!file)
        return "deny";
    const { workspaceId } = file.project;
    // Require a WorkspaceMember row
    const membership = await db.workspaceMember.findFirst({
        where: { userId, workspaceId },
        select: { id: true },
    });
    return membership ? "write" : "deny";
}
/**
 * Verifies the Clerk session token and resolves workspace authorization.
 * Throws on any failure — Hocuspocus will reject the connection.
 */
export async function onAuthenticate({ token, documentName, }) {
    let claims = null;
    try {
        claims = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
    }
    catch {
        throw new Error("Unauthorized: invalid token");
    }
    const userId = claims?.sub;
    if (!userId)
        throw new Error("Unauthorized: no sub claim");
    const decision = await authorizeConnection(userId, documentName);
    if (decision === "deny")
        throw new Error("Forbidden: not a workspace member");
    return { userId, readOnly: decision === "read" };
}
//# sourceMappingURL=authenticate.js.map