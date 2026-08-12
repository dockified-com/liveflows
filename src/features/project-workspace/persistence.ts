import type { WorkspaceLayout, WorkspaceState } from "./workspace-state";

const STORAGE_VERSION = 1;

export interface SerializedWorkspaceState {
  version: number;
  openIds: string[];
  activeFileId?: string;
  leftFileId?: string;
  rightFileId?: string;
  dividerRatio?: number;
  mobileVisibleParticipant?: "left" | "right" | null;
}

export function getStorageKey(userId: string, projectId: string): string {
  return `lf:ws:${userId}:${projectId}`;
}

export function loadWorkspaceState(
  userId: string,
  projectId: string,
): WorkspaceState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getStorageKey(userId, projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SerializedWorkspaceState;
    if (!parsed || parsed.version !== STORAGE_VERSION) return null;

    const {
      openIds = [],
      activeFileId,
      leftFileId,
      rightFileId,
      dividerRatio,
      mobileVisibleParticipant,
    } = parsed;

    if (openIds.length === 0) {
      return {
        layout: { kind: "empty" },
        mobileVisibleParticipant: null,
      };
    }

    let layout: WorkspaceLayout;
    if (
      leftFileId &&
      rightFileId &&
      openIds.includes(leftFileId) &&
      openIds.includes(rightFileId)
    ) {
      layout = {
        kind: "split",
        leftFileId,
        rightFileId,
        openIds,
        dividerRatio: Math.min(0.8, Math.max(0.2, dividerRatio ?? 0.5)),
      };
    } else {
      const active =
        activeFileId && openIds.includes(activeFileId)
          ? activeFileId
          : openIds[0];
      layout = {
        kind: "single",
        activeFileId: active,
        openIds,
      };
    }

    return {
      layout,
      mobileVisibleParticipant: mobileVisibleParticipant ?? null,
    };
  } catch (err) {
    console.warn("Failed to load workspace state from localStorage:", err);
    return null;
  }
}

export function saveWorkspaceState(
  userId: string,
  projectId: string,
  state: WorkspaceState,
): void {
  if (typeof window === "undefined") return;
  try {
    const { layout, mobileVisibleParticipant } = state;
    let serialized: SerializedWorkspaceState;

    if (layout.kind === "empty") {
      serialized = { version: STORAGE_VERSION, openIds: [] };
    } else if (layout.kind === "single") {
      serialized = {
        version: STORAGE_VERSION,
        openIds: layout.openIds,
        activeFileId: layout.activeFileId,
        mobileVisibleParticipant,
      };
    } else {
      serialized = {
        version: STORAGE_VERSION,
        openIds: layout.openIds,
        leftFileId: layout.leftFileId,
        rightFileId: layout.rightFileId,
        dividerRatio: layout.dividerRatio,
        mobileVisibleParticipant,
      };
    }

    localStorage.setItem(
      getStorageKey(userId, projectId),
      JSON.stringify(serialized),
    );
  } catch (err) {
    // QuotaExceededError or security restriction - log and proceed
    console.warn("Failed to save workspace state to localStorage:", err);
  }
}
