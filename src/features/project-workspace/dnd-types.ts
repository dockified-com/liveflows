export interface TabDragData {
  fileId: string;
  index: number;
}

export interface TabDragEndEvent {
  activeId: string;
  overId: string | null;
}
