"use client";

import { useEffect, useRef } from "react";
import { useUiStore } from "@/stores/ui";

export function CreateProjectModal({
  createAction,
}: {
  createAction: (formData: FormData) => Promise<void>;
}) {
  const { modal, closeModal } = useUiStore();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = modal?.kind === "create-project";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
      inputRef.current?.focus();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onClose={closeModal}
      aria-labelledby="create-project-title"
      className="rounded-lg p-0 backdrop:bg-black/50"
    >
      <form
        action={createAction}
        onSubmit={() => closeModal()}
        className="p-6 w-80"
      >
        <h2 id="create-project-title" className="text-lg font-semibold mb-4">
          Create project
        </h2>
        <label
          htmlFor="project-name"
          className="block text-sm font-medium mb-1"
        >
          Project name
        </label>
        <input
          ref={inputRef}
          id="project-name"
          name="name"
          type="text"
          required
          minLength={1}
          maxLength={100}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Auth Architecture"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="rounded px-3 py-2 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Create
          </button>
        </div>
      </form>
    </dialog>
  );
}
