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
    <form action={formAction} className="flex flex-col gap-3">
      {state?.error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {state.error}
        </div>
      )}
      <input
        name="name"
        type="text"
        required
        placeholder="File name"
        className="rounded border px-3 py-2"
      />
      <select name="type" className="rounded border px-3 py-2">
        <option value="canvas">Canvas</option>
        <option value="document">Document</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create File"}
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
    <form action={formAction} className="flex flex-col gap-3">
      {state?.error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {state.error}
        </div>
      )}
      <input
        name="name"
        type="text"
        required
        placeholder="Folder name"
        className="rounded border px-3 py-2"
      />
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create Folder"}
      </button>
    </form>
  );
}
