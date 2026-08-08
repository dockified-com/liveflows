import { NextResponse } from "next/server";

/**
 * Clerk webhook endpoint — stub for C3 (Team Charlie, node 3).
 *
 * This route is PUBLIC in the proxy matcher (/api/webhooks(.*))
 * so Clerk can deliver events without a user session.
 * C3 will implement webhook verification and event handling.
 */
export async function POST() {
  // C3 will implement: verifyWebhook + event dispatch
  return NextResponse.json(
    { error: "Not implemented — awaiting C3" },
    { status: 501 },
  );
}
