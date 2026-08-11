import { WebhookHandler } from "@liveblocks/node";
import type { NextRequest } from "next/server";

import { db } from "@/server/db";
import { liveblocks } from "@/server/liveblocks";

const webhookHandler = new WebhookHandler(
  process.env.LIVEBLOCKS_WEBHOOK_SECRET!,
);

/**
 * Liveblocks webhook handler — keeps the Postgres canvas mirror in sync
 * with Liveblocks Storage via storageUpdated events.
 *
 * Security: every request is verified via WebhookHandler.verifyRequest.
 * Idempotency: deduplicated via ProcessedWebhook table keyed on svix-id header.
 * Mirror: fetches the full Storage document and upserts CanvasSnapshot.
 */
export async function POST(req: NextRequest) {
  // 1. Verify signature — rejects spoofed requests
  let event;
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

  // 2. Idempotency: deduplicate on svix-id header
  const svixId = req.headers.get("svix-id");
  if (!svixId) {
    return new Response("Missing svix-id", { status: 400 });
  }

  try {
    await db.processedWebhook.create({
      data: { id: svixId, source: "liveblocks" },
    });
  } catch {
    // Unique constraint violation — already processed, skip silently
    return new Response("Already processed", { status: 200 });
  }

  // 3. Filter: only process storageUpdated events
  if (event.type !== "storageUpdated") {
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
    return new Response("OK", { status: 200 });
  }

  if (file.type !== "canvas") {
    console.warn(
      `[liveblocks] Room ${event.data.roomId} is not a canvas (${file.type}) — ignoring canvas snapshot`,
    );
    return new Response("OK", { status: 200 });
  }

  // 5. Fetch Storage document and upsert CanvasSnapshot
  try {
    const doc = await liveblocks.getStorageDocument(
      event.data.roomId,
      "json",
    );

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
        elements: elements as any,
        appState: meta as any,
        elementCount,
        syncedAt: new Date(),
      },
      update: {
        elements: elements as any,
        appState: meta as any,
        elementCount,
        syncedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Liveblocks webhook mirror error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
