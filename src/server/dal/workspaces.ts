import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "../db";
import { UnauthorizedError } from "./errors";

export type WorkspaceRef = { id: string; slug: string };

/**
 * Asserts session, asserts orgSlug === slugFromUrl, lazy-upserts.
 * Redirects on failure — redirect() throws, nothing after it runs.
 */
export async function requireWorkspace(
  slugFromUrl: string,
): Promise<WorkspaceRef> {
  const { isAuthenticated, orgId, orgSlug } = await auth();

  if (!isAuthenticated || !orgId) {
    redirect("/sign-in");
  }

  // The session is the authority. The URL slug is only a label.
  if (orgSlug !== slugFromUrl) {
    redirect(`/w/${orgSlug}`);
  }

  // At this point orgSlug === slugFromUrl and is guaranteed non-null
  const slug = orgSlug as string;

  // Lazy upsert — never block onboarding on webhook delivery
  const workspace = await db.workspace.upsert({
    where: { clerkOrgId: orgId },
    update: {},
    create: { clerkOrgId: orgId, name: slug, slug },
    select: { id: true, slug: true },
  });

  return workspace;
}

/**
 * For route handlers with no slug in the path (e.g., liveblocks-auth).
 * Throws UnauthorizedError on failure.
 */
export async function requireWorkspaceByOrgId(
  orgId: string,
): Promise<WorkspaceRef> {
  const { isAuthenticated, orgId: sessionOrgId } = await auth();

  if (!isAuthenticated || !sessionOrgId || sessionOrgId !== orgId) {
    throw new UnauthorizedError();
  }

  const workspace = await db.workspace.upsert({
    where: { clerkOrgId: orgId },
    update: {},
    create: { clerkOrgId: orgId, name: orgId, slug: orgId },
    select: { id: true, slug: true },
  });

  return workspace;
}
