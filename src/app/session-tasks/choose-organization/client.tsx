"use client";

import { TaskChooseOrganization } from "@clerk/nextjs";

/**
 * Client component for the choose-organization session task.
 *
 * After the user selects/creates an org, they redirect to "/" which
 * the proxy will then allow through to the authenticated app shell.
 */
export function ChooseOrganizationClient() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <TaskChooseOrganization redirectUrlComplete="/" />
    </div>
  );
}
