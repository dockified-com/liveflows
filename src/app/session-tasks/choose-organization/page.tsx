import { ChooseOrganizationClient } from "./client";

/**
 * Session task page for organization selection.
 *
 * Clerk routes here automatically when the session has a pending
 * "choose-organization" task (Membership required mode). This page
 * must NOT be linked to directly — Clerk navigates here via the
 * `taskUrls` configuration in ClerkProvider.
 *
 * Force dynamic rendering: this page requires an active Clerk session
 * and cannot be statically generated.
 */
export const dynamic = "force-dynamic";

export default function ChooseOrganizationPage() {
  return <ChooseOrganizationClient />;
}
