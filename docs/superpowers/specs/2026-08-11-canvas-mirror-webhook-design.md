# Task J: Canvas Mirror Webhook (Liveblocks) Design

**Date:** 2026-08-11
**Status:** Approved
**Scope:** MVP 1a (Task J)

## 1. Overview
The LiveFlows app uses Liveblocks as the real-time source of truth during canvas editing. To allow project list previews, searching, and read-only outage fallbacks, we need an eventually consistent mirror in Postgres. This specification defines the webhook handler that receives `storageUpdated` events from Liveblocks and upserts the state into the `CanvasSnapshot` table.

## 2. Schema Reconciliation
The original architecture design document specified an `appState: Json` column, but the current `schema.prisma` implements `viewBackgroundColor: String`.

We will migrate to match the original design doc:
*   **Action:** Modify `prisma/schema.prisma`.
*   **Remove:** `viewBackgroundColor String @default("#ffffff")`
*   **Add:** `appState Json @default("{}")`
*   **Note:** The generated Prisma client must be updated after this change.

## 3. Webhook Route (`src/app/api/webhooks/liveblocks/route.ts`)

### 3.1. Verification & Security
*   The route will handle `POST` requests.
*   It must use `@liveblocks/node`'s `WebhookHandler.verifyRequest` to validate the incoming request using the `LIVEBLOCKS_WEBHOOK_SECRET` environment variable.
*   Invalid signatures must return a `400 Bad Request`.

### 3.2. Idempotency (ProcessedWebhook)
*   The handler must extract the `svix-id` header from the webhook request.
*   It must attempt to `create` a row in the `ProcessedWebhook` table with `id: svix-id` and `source: 'liveblocks'`.
*   If this throws a unique constraint violation (we have already processed this ID), the handler must catch the error and immediately return `200 OK` without further processing.

### 3.3. Mirroring Logic
1.  **Filter:** Only process events where `event.type === 'storageUpdated'`. Other events return `200 OK`.
2.  **Project Lookup:** Query the `Project` table for the row where `liveblocksRoomId` matches `event.data.roomId`. If no project is found (e.g., room deleted out of band), log a warning and return `200 OK`.
3.  **Fetch Storage:** Use the `@liveblocks/node` client to fetch the full JSON document: `liveblocks.getStorageDocument(event.data.roomId, 'json')`.
4.  **Process Elements:** 
    *   Extract the elements array from `doc.elements`.
    *   Calculate `elementCount` by filtering out deleted elements (`!e.isDeleted`).
5.  **Upsert:** Perform a Prisma `upsert` on `CanvasSnapshot` using `projectId`.
    *   Set `elements` to the extracted elements.
    *   Set `appState` to `doc.meta` (or `{}` if undefined).
    *   Set `elementCount` to the calculated value.
    *   Update `syncedAt` to the current timestamp.

## 4. Testing
*   The implementation must include unit/integration tests (`src/app/api/webhooks/liveblocks/__tests__/route.test.ts` or similar).
*   Tests must verify: signature rejection (400), idempotency short-circuit (200), ignored event types (200), missing project behavior (200), and a successful storage fetch leading to a database upsert.
