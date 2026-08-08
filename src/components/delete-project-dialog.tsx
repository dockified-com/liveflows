"use client";

import { useEffect, useRef } from "react";
import { useUiStore } from "@/stores/ui";

export function DeleteProjectDialog({
  deleteAction,
}: {
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const { modal, closeModal } = useUiStore();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isOpen = modal?.kind === "delete-project";
  const projectId = isOpen ? modal.id : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onClose={closeModal}
      aria-labelledby="delete-project-title"
      className="rounded-lg p-0 backdrop:bg-black/50"
    >
      <form
        action={deleteAction}
        onSubmit={() => closeModal()}
        className="p-6 w-80"
      >
        <h2 id="delete-project-title" className="text-lg font-semibold mb-2">
          Delete project?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          This will permanently delete the project and its canvas. This action
          cannot be undone.
        </p>
        <input type="hidden" name="projectId" value={projectId ?? ""} />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="rounded px-3 py-2 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            Delete
          </button>
        </div>
      </form>
    </dialog>
  );
}
