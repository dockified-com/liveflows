"use client";

import { useActionState } from "react";
import { createFileAction, createFolderAction } from "./actions";

export function CreateFileForm({
  workspaceSlug,
  projectId,
  folderId,
}: {
  workspaceSlug: string;
  projectId: string;
  folderId: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    createFileAction.bind(null, workspaceSlug, projectId, folderId),
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 font-mono text-xs">
      {state?.error && (
        <div className="text-red-400 bg-red-950/50 p-2 rounded border border-red-800">
          {state.error}
        </div>
      )}
      <input
        name="name"
        type="text"
        required
        placeholder="FILE NAME"
        className="rounded border border-[#30363d] bg-[#0e1117] px-3 py-2 text-[#f0f6fc] placeholder-[#484f58] focus:border-[#ff9e00] focus:outline-none"
      />
      <select
        name="type"
        className="rounded border border-[#30363d] bg-[#0e1117] px-3 py-2 text-[#f0f6fc] focus:border-[#ff9e00] focus:outline-none"
      >
        <option value="canvas">CANVAS (EXCALIDRAW)</option>
        <option value="document">DOCUMENT (TIPTAP)</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-[#ff9e00] bg-[#ff9e00]/10 px-4 py-2 font-semibold text-[#ff9e00] hover:bg-[#ff9e00] hover:text-[#0e1117] disabled:opacity-50 transition-colors"
      >
        {isPending ? "CREATING..." : "+ CREATE FILE"}
      </button>
    </form>
  );
}

export function CreateFolderForm({
  workspaceSlug,
  projectId,
  parentId,
}: {
  workspaceSlug: string;
  projectId: string;
  parentId: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    createFolderAction.bind(null, workspaceSlug, projectId, parentId),
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 font-mono text-xs">
      {state?.error && (
        <div className="text-red-400 bg-red-950/50 p-2 rounded border border-red-800">
          {state.error}
        </div>
      )}
      <input
        name="name"
        type="text"
        required
        placeholder="FOLDER NAME"
        className="rounded border border-[#30363d] bg-[#0e1117] px-3 py-2 text-[#f0f6fc] placeholder-[#484f58] focus:border-[#ff9e00] focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-[#ff9e00] bg-[#ff9e00]/10 px-4 py-2 font-semibold text-[#ff9e00] hover:bg-[#ff9e00] hover:text-[#0e1117] disabled:opacity-50 transition-colors"
      >
        {isPending ? "CREATING..." : "+ CREATE FOLDER"}
      </button>
    </form>
  );
}
