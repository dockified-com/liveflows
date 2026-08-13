# Liveblocks Outage Read-Only Fallback

**Status**: Accepted  
**Date**: 2026-08-11

## Summary
When Liveblocks is unreachable, the application should gracefully degrade rather than crashing. Users should be able to view their projects and files in a read-only state using the `CanvasSnapshot` data mirrored in our Postgres database. A banner should alert users that they are in read-only mode due to a connectivity issue.

## Requirements
- **AC-1**: If the Liveblocks room fails to load or connect within a timeout, the canvas automatically falls back to rendering the latest `CanvasSnapshot` from the database.
- **AC-2**: The Excalidraw canvas is rendered in `viewModeEnabled={true}` when in fallback mode.
- **AC-3**: A visible banner informs the user that the system is currently in read-only fallback mode.
- **AC-4**: Other application areas (auth, dashboard, file lists) remain unaffected and fully operational.

## Decision
We will implement an error boundary or connection timeout within the `CanvasRoom` component (`src/features/canvas/canvas-room.tsx`). Liveblocks provides connection status hooks (`useStatus`, `useRoom`). If `useStatus` remains "connecting" for too long, or transitions to "failed" / "disconnected", we will toggle a fallback state.

**Implementation detail:**
We will update the `CanvasRoom` (or its wrapper) to accept the pre-fetched `CanvasSnapshot` data as a prop (which is already possible by fetching it in the server component `page.tsx`). If the Liveblocks `RoomProvider` fails to connect or we detect an outage, we render a pure `Excalidraw` component fed by the snapshot data in `viewModeEnabled={true}`, wrapped with an alert banner.

## Build plan
1. Update `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx` (or `/f/[fileId]/page.tsx`) to fetch the latest `CanvasSnapshot` and pass it down as initial data/fallback data.
2. Update `src/features/canvas/canvas-room.tsx` to use `useStatus` from Liveblocks. If status is `error` or disconnected for a prolonged period, render the fallback UI.
3. Build the fallback UI using the provided snapshot elements and `appState`, setting `viewModeEnabled={true}`.
4. Add a global banner for the read-only warning.

## Rationale
Since we already have a robust webhook maintaining an eventually consistent mirror in Postgres (`CanvasSnapshot`), we get read-only fallback almost for free. Relying on `useStatus` avoids complex custom pinging logic and leverages the Liveblocks SDK's built-in socket health checks.

## Consequences
- The fallback data might be up to 60 seconds stale (the webhook throttling window). This is acceptable during a total outage.
