import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

import { db } from "@/server/db";

/**
 * Clerk webhook handler — keeps Postgres in sync with Clerk user/org/membership events.
 *
 * Security: every request is verified via `verifyWebhook` (Svix signature check).
 * Idempotency: deduplicated via ProcessedWebhook table keyed on svix-id header.
 * Roles: stored as opaque strings — never validated against a closed set.
 */
export async function POST(req: NextRequest) {
  // 1. Verify signature — rejects spoofed requests
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Bad signature", { status: 400 });
  }

  // 2. Idempotency: deduplicate on svix-id header
  const svixId = req.headers.get("svix-id");
  if (!svixId) {
    return new Response("Missing svix-id", { status: 400 });
  }

  try {
    await db.processedWebhook.create({
      data: { id: svixId, source: "clerk" },
    });
  } catch {
    // Unique constraint violation — already processed, skip silently
    return new Response("Already processed", { status: 200 });
  }

  // 3. Dispatch to handler based on event type
  try {
    switch (evt.type) {
      case "user.created":
      case "user.updated": {
        const {
          id,
          email_addresses,
          primary_email_address_id,
          first_name,
          last_name,
          image_url,
        } = evt.data;
        const primaryEmail = email_addresses?.find(
          (e) => e.id === primary_email_address_id,
        );
        const email = primaryEmail?.email_address ?? "";
        const name = [first_name, last_name].filter(Boolean).join(" ") || null;

        await db.user.upsert({
          where: { id },
          update: { email, name, avatarUrl: image_url ?? null },
          create: { id, email, name, avatarUrl: image_url ?? null },
        });
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;
        if (id) {
          await db.user.delete({ where: { id } }).catch(() => {
            // Already deleted or never existed — idempotent
          });
        }
        break;
      }

      case "organization.created":
      case "organization.updated": {
        const { id, name, slug } = evt.data;
        await db.workspace.upsert({
          where: { clerkOrgId: id },
          update: { name: name ?? id, slug: slug ?? id },
          create: { clerkOrgId: id, name: name ?? id, slug: slug ?? id },
        });
        break;
      }

      case "organizationMembership.created":
      case "organizationMembership.updated": {
        const { organization, public_user_data, role } = evt.data;
        const orgId = organization?.id;
        const userId = public_user_data?.user_id;
        if (!orgId || !userId) break;

        // Ensure workspace exists (membership may arrive before organization.created)
        const workspace = await db.workspace.upsert({
          where: { clerkOrgId: orgId },
          update: {},
          create: { clerkOrgId: orgId, name: orgId, slug: orgId },
          select: { id: true },
        });

        // Ensure user exists (membership may arrive before user.created)
        await db.user.upsert({
          where: { id: userId },
          update: {},
          create: { id: userId, email: "" },
        });

        // Upsert membership — role is an opaque string, stored as-is
        await db.workspaceMember.upsert({
          where: {
            userId_workspaceId: { userId, workspaceId: workspace.id },
          },
          update: { role: role ?? "org:member" },
          create: {
            userId,
            workspaceId: workspace.id,
            role: role ?? "org:member",
          },
        });
        break;
      }

      case "organizationMembership.deleted": {
        const { organization, public_user_data } = evt.data;
        const orgId = organization?.id;
        const userId = public_user_data?.user_id;
        if (!orgId || !userId) break;

        const workspace = await db.workspace.findUnique({
          where: { clerkOrgId: orgId },
          select: { id: true },
        });
        if (!workspace) break;

        await db.workspaceMember.deleteMany({
          where: { userId, workspaceId: workspace.id },
        });
        break;
      }

      default:
        // Unhandled event — acknowledge to prevent retries
        break;
    }
  } catch (err) {
    console.error(`Clerk webhook handler error for ${evt.type}:`, err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
