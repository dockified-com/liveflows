import { create } from "zustand";

type ModalState =
  | null
  | { kind: "create-project" }
  | { kind: "rename-project"; id: string }
  | { kind: "delete-project"; id: string };

type UiState = {
  sidebarOpen: boolean;
  modal: ModalState;
  elementCount: number;
  toggleSidebar: () => void;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  setElementCount: (count: number) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  modal: null,
  elementCount: 0,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  setElementCount: (elementCount) => set({ elementCount }),
}));
