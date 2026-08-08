import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Entry point.
 *
 * There is no marketing page in MVP 1a, so `/` is purely a router:
 *   not signed in        -> /sign-in
 *   signed in, no org    -> the Clerk choose-organization task
 *   signed in with an org-> that workspace's project list
 *
 * The session is the authority for the active organization, which is why the
 * slug comes from `auth()` rather than from anything user-supplied.
 */
export default async function Home() {
  const { isAuthenticated, orgSlug } = await auth();

  if (!isAuthenticated) {
    redirect("/sign-in");
  }

  if (!orgSlug) {
    redirect("/session-tasks/choose-organization");
  }

  redirect(`/w/${orgSlug}`);
}
