"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
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
      className="w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--line)] bg-[var(--card)] p-0 text-[var(--ink)] shadow-xl backdrop:bg-slate-900/40"
    >
      <form action={deleteAction} onSubmit={() => closeModal()} className="p-6">
        <h2
          id="delete-project-title"
          className="mb-2 text-[17px] font-semibold text-[var(--ink)]"
        >
          Delete project?
        </h2>
        <p className="mb-4 text-[13.5px] text-[var(--ink-soft)]">
          This will permanently delete the project and its canvas. This action
          cannot be undone.
        </p>
        <input type="hidden" name="projectId" value={projectId ?? ""} />
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" size="md" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="destructive" size="md" type="submit">
            Delete
          </Button>
        </div>
      </form>
    </dialog>
  );
}
