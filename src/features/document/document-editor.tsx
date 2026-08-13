"use client";

import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { Icon } from "@/components/ui/icon";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

const { RoomProvider } = createRoomContext(client);

export interface DocumentEditorProps {
  roomId: string;
  readOnly?: boolean;
}

function InnerDocumentEditor({ readOnly = false }: { readOnly?: boolean }) {
  const liveblocks = useLiveblocksExtension();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      liveblocks,
    ],
    editable: !readOnly,
  });

  if (!editor) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--surface)] text-xs text-[var(--ink-tertiary)]">
        Loading document editor...
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--surface)] font-sans">
      {/* Document Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 select-none">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
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
