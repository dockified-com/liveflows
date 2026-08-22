"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type React from "react";
import {
  RoomProvider,
  useCollaborationExtension,
  useProviderStatus,
} from "./collaboration-provider";
import { buildExtensions } from "./extensions";
import { BlockHandle } from "./ui/block-handle/block-handle";
import { BubbleToolbar } from "./ui/bubble-toolbar";
import { FindBar } from "./ui/find-bar";
import { SaveStatus } from "./ui/save-status";
import { TableControls } from "./ui/table-controls";
import { Toolbar } from "./ui/toolbar";

import { useState, useEffect } from "react";
import { PageHeader } from "./ui/page-header";
import { ThemeToggle, type ThemeMode } from "./ui/theme-toggle";

export interface DocumentEditorProps {
  roomId: string;
  readOnly?: boolean;
  /** Document title */
  initialTitle?: string;
  /** Document emoji icon */
  initialIcon?: string | null;
  /** Document cover banner gradient or image */
  initialCover?: string | null;
  /** Initial theme mode */
  initialTheme?: ThemeMode;
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
  initialTitle = "Untitled Document",
  initialIcon = "📄",
  initialCover = null,
  initialTheme,
  toolbarSlot,
  bubbleSlot,
  blockHandleSlot,
  findSlot,
}: DocumentEditorProps) {
  const collaboration = useCollaborationExtension(roomId);
  const status = useProviderStatus();

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (initialTheme) return initialTheme;
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("mode") === "dark") return "dark";
      if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    }
    return "light";
  });

  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState<string | null>(initialIcon);
  const [cover, setCover] = useState<string | null>(initialCover);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("mode") === "dark") {
        setTheme("dark");
      }
    }
  }, []);

  const editor = useEditor(
    {
      extensions: buildExtensions({ collaboration }),
      editable: !readOnly,
      immediatelyRender: false,
    },
    [roomId],
  );

  if (!editor) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--card)] p-6 ${theme === "dark" ? "dark doc-dark" : ""}`}
      >
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
    <div
      data-theme={theme}
      className={`flex h-full w-full flex-col bg-[var(--card)] font-sans text-[var(--ink)] transition-colors duration-150 ${
        theme === "dark" ? "dark doc-dark" : ""
      }`}
    >
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

      {/* Top Action Bar (Minimal Notion Style) */}
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--card)] px-3 py-1 shrink-0 z-20">
        <div className="min-w-0 flex-1 overflow-x-auto">
          {toolbarSlot ? (
            toolbarSlot
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)] select-none">
              <span>{icon || "📄"}</span>
              <span className="font-medium text-[var(--ink)] truncate max-w-xs">
                {title || "Untitled"}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {!readOnly && (
            <>
              <button
                type="button"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
                aria-label="Undo"
                title="Undo (⌘Z)"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
              </button>
              <button
                type="button"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
                aria-label="Redo"
                title="Redo (⌘⇧Z)"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 7v6h-6" />
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                </svg>
              </button>
              <div className="h-4 w-px bg-[var(--line)]" aria-hidden="true" />
            </>
          )}
          <SaveStatus status={status} readOnly={readOnly} />
          <div className="h-4 w-px bg-[var(--line)]" aria-hidden="true" />
          <ThemeToggle theme={theme} onThemeChange={setTheme} />
        </div>
      </div>

      {findSlot ?? <FindBar editor={editor} />}

      {/* Notion Document Canvas (Centered with generous margins) */}
      <div className="relative min-h-0 flex-1 overflow-y-auto bg-[var(--card)]">
        <div className="mx-auto w-full max-w-4xl px-6 sm:px-12 md:px-16 pt-4 pb-36">
          <PageHeader
            title={title}
            onTitleChange={setTitle}
            icon={icon}
            onIconChange={setIcon}
            cover={cover}
            onCoverChange={setCover}
            readOnly={readOnly}
          />

          <div className="relative mt-2 text-sm leading-relaxed text-[var(--ink)]">
            {!readOnly && (blockHandleSlot ?? <BlockHandle editor={editor} />)}
            {!readOnly && (bubbleSlot ?? <BubbleToolbar editor={editor} />)}
            {!readOnly && <TableControls editor={editor} />}
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentEditor(props: DocumentEditorProps) {
  return (
    <RoomProvider key={props.roomId} id={props.roomId}>
      <InnerDocumentEditor key={props.roomId} {...props} />
    </RoomProvider>
  );
}
