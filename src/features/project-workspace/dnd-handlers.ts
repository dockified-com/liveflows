import type { TabDragEndEvent } from "./dnd-types";
import { reorderTabs, type WorkspaceState } from "./workspace-state";

/**
 * Pure state transformation for DND tab reordering.
 * Returns updated WorkspaceState after a drag end event.
 */
export function handleDragEnd(
  state: WorkspaceState,
  event: TabDragEndEvent,
): WorkspaceState {
  const { activeId, overId } = event;

  if (!overId || activeId === overId) {
    return state;
  }

  if (state.layout.kind === "empty") {
    return state;
  }

  const { openIds } = state.layout;
  const fromIndex = openIds.indexOf(activeId);
  const toIndex = openIds.indexOf(overId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return state;
  }

  return reorderTabs(state, fromIndex, toIndex);
}
