"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "@/components/ui/modal-dialog";

export interface RenameItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => Promise<void>;
  currentName: string;
  itemType: "file" | "folder";
  isPending?: boolean;
}

export function RenameItemDialog({
  isOpen,
  onClose,
  onConfirm,
  currentName,
  itemType,
  isPending = false,
}: RenameItemDialogProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setError(null);
      setIsSubmitting(false);
      // Focus and select input on open
      requestAnimationFrame(() => {
        inputRef.current?.select();
      });
    }
  }, [isOpen, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (trimmed === currentName) {
      onClose();
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : `Failed to rename ${itemType}.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || isPending;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={`Rename ${itemType === "folder" ? "folder" : "file"}`}
      maxWidth="sm"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="rename-item-form"
            variant="primary"
            size="sm"
            disabled={busy || !name.trim()}
          >
            {busy ? "Renaming…" : "Rename"}
          </Button>
        </>
      }
    >
      <form id="rename-item-form" onSubmit={handleSubmit}>
        <label
          htmlFor="rename-item-input"
          className="block text-[13px] font-medium text-[var(--ink)] mb-1.5"
        >
          New name
        </label>
        <input
          id="rename-item-input"
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          disabled={busy}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
          placeholder={currentName}
          aria-describedby={error ? "rename-error" : undefined}
          aria-invalid={error ? "true" : undefined}
          autoComplete="off"
          maxLength={255}
        />
        {error && (
          <p
            id="rename-error"
            role="alert"
            className="mt-1.5 text-xs text-red-600"
          >
            {error}
          </p>
        )}
      </form>
    </ModalDialog>
  );
}
