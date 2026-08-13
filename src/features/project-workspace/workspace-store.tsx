"use client";

import { createContext, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";
import { loadWorkspaceState, saveWorkspaceState } from "./persistence";
import {
  activateFile,
  closeFile,
  closeSplit,
  INITIAL_WORKSPACE_STATE,
  openFile,
  reconcileAuthorized,
  reorderTabs,
  replaceSplitSide,
  setMobileVisible,
  splitWith,
  type WorkspaceState,
} from "./workspace-state";

export interface WorkspaceStoreActions {
  openFile: (fileId: string) => void;
  closeFile: (fileId: string) => void;
  activateFile: (fileId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  splitWith: (leftId: string, rightId: string) => void;
  replaceSplitSide: (side: "left" | "right", fileId: string) => void;
  closeSplit: () => void;
  setMobileVisible: (participant: "left" | "right" | null) => void;
}

export type WorkspaceStore = WorkspaceState & WorkspaceStoreActions;

export function createWorkspaceStore(
  userId: string,
  projectId: string,
  authorizedFileIds: string[],
) {
  const initial =
    loadWorkspaceState(userId, projectId) ?? INITIAL_WORKSPACE_STATE;
  const reconciledInitial = reconcileAuthorized(initial, authorizedFileIds);

  return createStore<WorkspaceStore>((set) => {
    const persist = (nextState: WorkspaceState) => {
      saveWorkspaceState(userId, projectId, nextState);
      return nextState;
    };

    return {
      ...reconciledInitial,
      openFile: (fileId) => set((state) => persist(openFile(state, fileId))),
      closeFile: (fileId) => set((state) => persist(closeFile(state, fileId))),
      activateFile: (fileId) =>
        set((state) => persist(activateFile(state, fileId))),
      reorderTabs: (fromIndex, toIndex) =>
        set((state) => persist(reorderTabs(state, fromIndex, toIndex))),
      splitWith: (leftId, rightId) =>
        set((state) => persist(splitWith(state, leftId, rightId))),
      replaceSplitSide: (side, fileId) =>
        set((state) => persist(replaceSplitSide(state, side, fileId))),
      closeSplit: () => set((state) => persist(closeSplit(state))),
      setMobileVisible: (participant) =>
        set((state) => persist(setMobileVisible(state, participant))),
    };
  });
}

export type WorkspaceStoreApi = ReturnType<typeof createWorkspaceStore>;

const WorkspaceStoreContext = createContext<WorkspaceStoreApi | null>(null);

export function ProjectWorkspaceProvider({
  userId,
  projectId,
  authorizedFileIds,
  children,
}: {
  userId: string;
  projectId: string;
  authorizedFileIds: string[];
  children: React.ReactNode;
}) {
  const storeRef = useRef<WorkspaceStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createWorkspaceStore(
      userId,
      projectId,
      authorizedFileIds,
    );
  }

  return (
    <WorkspaceStoreContext.Provider value={storeRef.current}>
      {children}
    </WorkspaceStoreContext.Provider>
  );
}

export function useProjectWorkspaceStore<T>(
  selector: (store: WorkspaceStore) => T,
): T {
  const store = useContext(WorkspaceStoreContext);
  if (!store) {
    throw new Error(
      "useProjectWorkspaceStore must be used within a ProjectWorkspaceProvider",
    );
  }
  return useStore(store, selector);
}
