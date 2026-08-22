"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "@/components/ui/modal-dialog";

export interface MoveItemTarget {
  id: string;
  name: string;
  type: "file" | "folder";
  targetFolderId: string | null;
  targetFolderName?: string;
}

export interface MoveItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  target: MoveItemTarget | null;
  isPending?: boolean;
}

export function MoveItemDialog({
  isOpen,
  onClose,
  onConfirm,
  target,
  isPending = false,
}: MoveItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!target) return null;

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : `Failed to move ${target.type}.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || isPending;
  const isMoveToRoot = target.targetFolderId === null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={`Move ${target.type}`}
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
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Moving…" : "Move"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--ink-secondary)]">
        Are you sure you want to move{" "}
        <span className="font-semibold text-[var(--ink)]">{target.name}</span>{" "}
        {isMoveToRoot ? (
          "into the project root?"
        ) : (
          <>
            into{" "}
            <span className="font-semibold text-[var(--ink)]">
              {target.targetFolderName ?? "folder"}
            </span>
            ?
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
