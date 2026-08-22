"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { CanvasRoom } from "@/features/canvas/canvas-room";

const DocumentEditor = dynamic(
  () =>
    import("@/features/document/document-editor").then((m) => m.DocumentEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[var(--surface)] text-xs text-[var(--ink-tertiary)]">
        Loading document editor...
      </div>
    ),
  },
);

export interface EditorPaneRouterProps {
  fileId: string;
  fileType: "canvas" | "document" | string;
  roomId?: string | null;
  fileName?: string;
}

export function EditorPaneRouter({
  fileId,
  fileType,
  roomId: roomIdProp,
  fileName,
}: EditorPaneRouterProps) {
  const roomId = roomIdProp || `file_${fileId}`;

  switch (fileType) {
    case "canvas":
      return (
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-[var(--surface)] text-xs text-[var(--ink-tertiary)]">
              Loading canvas...
            </div>
          }
        >
          <CanvasRoom key={roomId} roomId={roomId} />
        </Suspense>
      );

    case "document":
      return (
        <DocumentEditor
          key={roomId}
          roomId={roomId}
          initialTitle={fileName || "Untitled Document"}
        />
      );

    default:
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--surface)] p-4 text-center">
          <span className="text-2xl">⚠️</span>
          <p className="text-sm font-medium text-[var(--ink)]">
            Unsupported File Type
          </p>
          <p className="text-xs text-[var(--ink-tertiary)]">
            The file type &quot;{fileType}&quot; cannot be opened in this editor
            pane.
          </p>
        </div>
      );
  }
}
