# Storage-Ceiling Warning UI

**Status**: Accepted  
**Date**: 2026-08-11

## Summary
Liveblocks has a ~10MB storage limit per room. Since we do not yet implement garbage collection of soft-deleted elements, large canvases will eventually hit this limit and crash. We will implement an early warning UI to alert users to start a new file when they approach this limit.

## Requirements
- **AC-1**: Calculate the current number of elements in the `CanvasRoom` (including live and soft-deleted items if available, or just use the local element count tracking).
- **AC-2**: When the element count exceeds 3000, display a "warning" severity banner.
- **AC-3**: When the element count exceeds 5000, display a "critical" severity banner urging the user to start a new project soon.

## Decision
We will track the element count inside the `Canvas` component in `src/features/canvas/canvas-room.tsx` using `remoteElements?.length ?? fallbackElements?.length ?? 0`. We will surface this count into our `useUiStore` if needed, but primarily render conditional banners directly in the `CanvasRoom` overlay. 

## Build plan
1. Add `elementCount` state logic in `canvas-room.tsx`.
2. Add a styled warning overlay inside the `absolute` positioned header block of the canvas.
3. Show `<span data-testid="storage-warning" data-severity="warning">` for `> 3000` elements.
4. Show `<span data-testid="storage-warning" data-severity="critical">` for `> 5000` elements.

## Rationale
Simple conditional rendering based on array length is computationally cheap and gives the user enough lead time to export or restart before hitting the hard 10MB ceiling on Liveblocks storage. Garbage collection is complex and deferred.

## Consequences
- Does not prevent the crash, only warns about it.
- Requires user action to mitigate.
