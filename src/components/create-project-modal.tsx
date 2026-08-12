"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      className="w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--line)] bg-[var(--card)] p-0 text-[var(--ink)] shadow-xl backdrop:bg-slate-900/40"
    >
      <form action={createAction} onSubmit={() => closeModal()} className="p-6">
        <h2
          id="create-project-title"
          className="mb-4 text-[17px] font-semibold text-[var(--ink)]"
        >
          Create project
        </h2>
        <Input
          ref={inputRef}
          label="Project name"
          id="project-name"
          name="name"
          type="text"
          required
          minLength={1}
          maxLength={100}
          placeholder="e.g. Auth Architecture"
        />
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="secondary" size="md" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit">
            Create
          </Button>
        </div>
      </form>
    </dialog>
  );
}
