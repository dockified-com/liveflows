import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Public routes — accessible WITHOUT a session.
 *
 * SECURITY: every entry here is intentional:
 *   /                    – marketing landing page
 *   /sign-in(.*)        – Clerk sign-in flow (multi-step)
 *   /sign-up(.*)        – Clerk sign-up flow (multi-step)
 *   /api/webhooks(.*)   – inbound webhooks from Clerk (they carry
 *                         signing secrets, not user sessions; blocking them
 *                         causes silent 401 delivery failures)
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

/**
 * Proxy (formerly middleware) — AUTHENTICATION only.
 *
 * If a request is not to a public route and has no valid session,
 * Clerk redirects to sign-in. No authorization logic lives here;
 * authorization is enforced in the DAL (src/server/dal).
 */
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
