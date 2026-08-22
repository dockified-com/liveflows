"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type React from "react";
import {
  RoomProvider,
  useCollaborationExtension,
  useProviderStatus,
} from "./collaboration-provider";
import { buildExtensions } from "./extensions";
import { BubbleToolbar } from "./ui/bubble-toolbar";
import { Toolbar } from "./ui/toolbar";

export interface DocumentEditorProps {
  roomId: string;
  readOnly?: boolean;
  /** Filled by task-03. */
  toolbarSlot?: React.ReactNode;
  /** Filled by task-06. */
  bubbleSlot?: React.ReactNode;
  /** Filled by task-08. */
  blockHandleSlot?: React.ReactNode;
  /** Filled by task-11. */
  findSlot?: React.ReactNode;
}

function InnerDocumentEditor({
  roomId,
  readOnly = false,
  toolbarSlot,
  bubbleSlot,
  blockHandleSlot,
  findSlot,
}: DocumentEditorProps) {
  const collaboration = useCollaborationExtension(roomId);
  const status = useProviderStatus();

  const editor = useEditor({
    extensions: buildExtensions({ collaboration }),
    editable: !readOnly,
    immediatelyRender: false,
  });

  if (!editor) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--card)] p-6">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--bg-2)]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--bg-2)]" />
        <span className="pt-2 text-xs text-[var(--ink-faint)]">
          Loading document editor…
        </span>
      </div>
    );
  }

  const isOffline = status === "disconnected" || status === "failed";

  return (
    <div className="flex h-full w-full flex-col bg-[var(--card)] font-sans">
      {isOffline ? (
        <div
          role="alert"
          aria-live="assertive"
          className="flex shrink-0 items-center gap-1.5 bg-[var(--destructive)] px-3 py-1 text-xs font-medium text-white"
        >
          <span className="h-2 w-2 animate-ping rounded-full bg-white" />
          <span>Offline — changes won&apos;t be saved</span>
        </div>
      ) : null}

      {!readOnly && (toolbarSlot ?? <Toolbar editor={editor} />)}
      {findSlot}

      <div className="relative flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-[var(--ink)]">
        {blockHandleSlot}
        {!readOnly && (bubbleSlot ?? <BubbleToolbar editor={editor} />)}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function DocumentEditor(props: DocumentEditorProps) {
  return (
    <RoomProvider id={props.roomId}>
      <InnerDocumentEditor {...props} />
    </RoomProvider>
  );
}
