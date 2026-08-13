import { WebhookHandler } from "@liveblocks/node";
import type { NextRequest } from "next/server";

import { db } from "@/server/db";
import { liveblocks } from "@/server/liveblocks";

const webhookHandler = new WebhookHandler(
  process.env.LIVEBLOCKS_WEBHOOK_SECRET || "whsec_BUILD_DEFAULT_WEBHOOK_SECRET",
);

/**
 * Liveblocks webhook handler — keeps the Postgres canvas mirror in sync
 * with Liveblocks Storage via storageUpdated events.
 *
 * Security: every request is verified via WebhookHandler.verifyRequest.
 * Idempotency (D44): deduplicated via ProcessedWebhook table keyed on svix-id.
 *   status="completed" → skip; status="processing" with live lease → 409 defer.
 * Mirror: fetches the full Storage document and upserts CanvasSnapshot.
 */

const LEASE_SECONDS = 60; // Storage fetch can be slow

export async function POST(req: NextRequest) {
  // 1. Verify signature — rejects spoofed requests
  // biome-ignore lint/suspicious/noExplicitAny: Webhook event payload type from Liveblocks SDK
  let event: any;
  try {
    const rawBody = await req.text();
    event = webhookHandler.verifyRequest({
      headers: Object.fromEntries(req.headers.entries()),
      rawBody,
    });
  } catch (err) {
    console.error("Liveblocks webhook verification failed:", err);
    return new Response("Bad signature", { status: 400 });
  }

  // 2. Idempotency / lease acquisition (D44)
  const svixId = req.headers.get("svix-id");
  if (!svixId) {
    return new Response("Missing svix-id", { status: 400 });
  }

  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LEASE_SECONDS * 1000);

  const existing = await db.processedWebhook.findUnique({
    where: { id: svixId },
    select: { status: true, leaseUntil: true },
  });

  if (existing) {
    if (existing.status === "completed") {
      return new Response("Already processed", { status: 200 });
    }
    if (
      existing.status === "processing" &&
      existing.leaseUntil &&
      existing.leaseUntil > now
    ) {
      return new Response("Processing in progress", { status: 409 });
    }
    // Expired lease or failed — take over
    await db.processedWebhook.update({
      where: { id: svixId },
      data: {
        status: "processing",
        leaseUntil,
        attemptCount: { increment: 1 },
      },
    });
  } else {
    try {
      await db.processedWebhook.create({
        data: {
          id: svixId,
          source: "liveblocks",
          status: "processing",
          leaseUntil,
          attemptCount: 1,
        },
      });
    } catch {
      // Race: another replica inserted first
      return new Response("Processing in progress", { status: 409 });
    }
  }

  // 3. Filter: only process storageUpdated events
  if (event.type !== "storageUpdated") {
    await db.processedWebhook
      .update({
        where: { id: svixId },
        data: {
          status: "completed",
          leaseUntil: null,
          completedAt: new Date(),
        },
      })
      .catch(() => {});
    return new Response("OK", { status: 200 });
  }

  // 4. File lookup by liveblocksRoomId
  const file = await db.file.findUnique({
    where: { liveblocksRoomId: event.data.roomId },
    select: { id: true, type: true },
  });

  if (!file) {
    console.warn(
      `[liveblocks] No file found for room ${event.data.roomId} — webhook ignored`,
    );
    await db.processedWebhook
      .update({
        where: { id: svixId },
        data: {
          status: "completed",
          leaseUntil: null,
          completedAt: new Date(),
        },
      })
      .catch(() => {});
    return new Response("OK", { status: 200 });
  }

  if (file.type !== "canvas") {
    console.warn(
      `[liveblocks] Room ${event.data.roomId} is not a canvas (${file.type}) — ignoring canvas snapshot`,
    );
    await db.processedWebhook
      .update({
        where: { id: svixId },
        data: {
          status: "completed",
          leaseUntil: null,
          completedAt: new Date(),
        },
      })
      .catch(() => {});
    return new Response("OK", { status: 200 });
  }

  // 5. Fetch Storage document and upsert CanvasSnapshot
  try {
    const doc = await liveblocks.getStorageDocument(event.data.roomId, "json");

    const elementsObj: Record<string, unknown> =
      (doc as Record<string, unknown>).elements != null
        ? ((doc as Record<string, unknown>).elements as Record<string, unknown>)
        : {};

    const elements = Object.values(elementsObj);
    const elementCount = elements.filter(
      (e) => !(e as { isDeleted?: boolean }).isDeleted,
    ).length;

    const meta = (doc as Record<string, unknown>).meta ?? {};

    await db.canvasSnapshot.upsert({
      where: { fileId: file.id },
      create: {
        fileId: file.id,
        elements: elements as never,
        appState: meta as never,
        elementCount,
        syncedAt: new Date(),
      },
      update: {
        elements: elements as never,
        appState: meta as never,
        elementCount,
        syncedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Liveblocks webhook mirror error:", err);

    await db.processedWebhook
      .update({
        where: { id: svixId },
        data: { status: "failed", leaseUntil: null },
      })
      .catch(() => {});

    return new Response("Handler error", { status: 500 });
  }

  // 6. Mark completed
  await db.processedWebhook
    .update({
      where: { id: svixId },
      data: { status: "completed", leaseUntil: null, completedAt: new Date() },
    })
    .catch(() => {});

  return new Response("OK", { status: 200 });
}
