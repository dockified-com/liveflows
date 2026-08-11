# Task K: Liveblocks Outage Read-Only Fallback Design

**Date:** 2026-08-11
**Status:** Approved
**Scope:** MVP 1a (Task K)

## 1. Overview
When Liveblocks is unreachable (status `disconnected`), the canvas must render read-only using `CanvasSnapshot` data, with a banner notifying the user.

## 2. Implementation
*   **File:** `src/features/canvas/canvas-room.tsx`
*   **UI Banner:** When `useStatus()` is `'disconnected'`, display a fixed, highly visible red banner at the top of the viewport reading: *"Liveblocks is unreachable. The canvas is in read-only mode."*
*   **Read-Only Mode:** Pass `viewModeEnabled={status === 'disconnected'}` to the `<Excalidraw>` component. This natively hides the toolbars and prevents editing.
*   **Fallback Elements:** The `fallbackElements` prop is already being passed from the server. Ensure it renders correctly when disconnected.

## 3. Testing
*   Add a test to verify the banner appears and `viewModeEnabled` is true when status is disconnected.
