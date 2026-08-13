"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Icon } from "@/components/ui/icon";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

const { RoomProvider, useStatus } = createRoomContext(client);

export interface DocumentEditorProps {
  roomId: string;
  readOnly?: boolean;
}

function InnerDocumentEditor({ readOnly = false }: { readOnly?: boolean }) {
  const liveblocks = useLiveblocksExtension();
  const status = useStatus();

  const editor = useEditor({
    extensions: [StarterKit.configure({}), liveblocks],
    editable: !readOnly,
  });

  const isOffline =
    status === "disconnected" || (status as string) === "failed";

  if (!editor) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--surface)] p-6 space-y-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--surface-hover)]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--surface-hover)]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--surface-hover)]" />
        <span className="text-xs text-[var(--ink-tertiary)] pt-2">
          Loading document editor...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--surface)] font-sans">
      {/* Offline Status Banner */}
      {isOffline && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-600 text-white px-3 py-1 text-xs font-medium flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            <span>Offline — changes won't be saved</span>
          </div>
        </div>
      )}

      {/* Accessible Document Toolbar */}
      {!readOnly && (
        <div
          role="toolbar"
          aria-label="Formatting options"
          className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 select-none shrink-0"
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
            aria-pressed={editor.isActive("bold")}
            className={`rounded p-1 text-xs transition-colors ${
              editor.isActive("bold")
                ? "bg-[var(--surface-hover)] text-[var(--accent)] font-bold"
                : "text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
            }`}
            title="Bold"
          >
            <strong>B</strong>
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
            aria-pressed={editor.isActive("italic")}
            className={`rounded p-1 text-xs transition-colors ${
              editor.isActive("italic")
                ? "bg-[var(--surface-hover)] text-[var(--accent)] italic"
                : "text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
            }`}
            title="Italic"
          >
            <em>I</em>
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            aria-label="Strikethrough"
            aria-pressed={editor.isActive("strike")}
            className={`rounded p-1 text-xs transition-colors ${
              editor.isActive("strike")
                ? "bg-[var(--surface-hover)] text-[var(--accent)] line-through"
                : "text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
            }`}
            title="Strikethrough"
          >
            <s>S</s>
          </button>

          <div className="h-4 w-px bg-[var(--border)] mx-1" />

          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            aria-label="Heading 1"
            aria-pressed={editor.isActive("heading", { level: 1 })}
            className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
              editor.isActive("heading", { level: 1 })
                ? "bg-[var(--surface-hover)] text-[var(--accent)] font-semibold"
                : "text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
            }`}
            title="Heading 1"
          >
            H1
          </button>

          <button
            type="button"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            aria-label="Heading 2"
            aria-pressed={editor.isActive("heading", { level: 2 })}
            className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
              editor.isActive("heading", { level: 2 })
                ? "bg-[var(--surface-hover)] text-[var(--accent)] font-semibold"
                : "text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
            }`}
            title="Heading 2"
          >
            H2
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bullet List"
            aria-pressed={editor.isActive("bulletList")}
            className={`rounded p-1 text-xs transition-colors ${
              editor.isActive("bulletList")
                ? "bg-[var(--surface-hover)] text-[var(--accent)]"
                : "text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
            }`}
            title="Bullet List"
          >
            <Icon size="sm">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </Icon>
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-6 text-sm text-[var(--ink)] leading-relaxed focus:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function DocumentEditor({ roomId, readOnly }: DocumentEditorProps) {
  return (
    <RoomProvider id={roomId}>
      <InnerDocumentEditor readOnly={readOnly} />
    </RoomProvider>
  );
}
