# Task L: Storage-Ceiling Warning UI Design

**Date:** 2026-08-11
**Status:** Approved
**Scope:** MVP 1a (Task L)

## 1. Overview
Liveblocks has a ~10MB per-room storage ceiling. Excalidraw soft-deletes elements, so arrays only grow. We track `elementCount` in the Zustand store. We need to show a warning when it gets too high.

## 2. Implementation
*   **Thresholds:** Display a warning if `elementCount > 3000`. Display a critical alert if `elementCount > 5000`.
*   **UI Location:** Display this warning in the `CanvasRoom` UI (perhaps next to the status pill).
*   **Content:** "Warning: Canvas is getting large. Consider starting a new project soon."

## 3. Testing
*   Ensure the warning appears based on `elementCount`.
