"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "@/components/ui/modal-dialog";

export interface DeleteItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemName: string;
  itemType: "file" | "folder";
  isPending?: boolean;
}

export function DeleteItemDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isPending = false,
}: DeleteItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : `Failed to delete ${itemType}.`,
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
      title={`Delete ${itemType}`}
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
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--ink-secondary)]">
        {itemType === "folder" ? (
          <>
            Delete{" "}
            <span className="font-medium text-[var(--ink)]">{itemName}</span>{" "}
            and all its contents? This cannot be undone.
          </>
        ) : (
          <>
            Delete{" "}
            <span className="font-medium text-[var(--ink)]">{itemName}</span>?
            This cannot be undone.
          </>
        )}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </ModalDialog>
  );
}
