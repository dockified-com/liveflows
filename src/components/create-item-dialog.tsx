"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { InlineError } from "@/components/ui/inline-error";

export interface CreateItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: "canvas" | "document" | "folder";
    destinationFolderId: string | null;
  }) => Promise<void>;
  initialType?: "canvas" | "document" | "folder";
  initialFolderId?: string | null;
  folders: { id: string; name: string; parentId: string | null }[];
}

export function CreateItemDialog({
  isOpen,
  onClose,
  onSubmit,
  initialType = "canvas",
  initialFolderId = null,
  folders,
}: CreateItemDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"canvas" | "document" | "folder">(
    initialType,
  );
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameId = useId();
  const typeId = useId();
  const folderSelectId = useId();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        type,
        destinationFolderId: folderId,
      });
      setName("");
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create item. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-dialog-title"
    >
      <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h2
            id="create-dialog-title"
            className="text-base font-semibold text-[var(--ink)] flex items-center gap-2"
          >
            Create New Item
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--ink-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            aria-label="Close dialog"
          >
            <Icon size="sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </Icon>
          </button>
        </div>

        {error && <InlineError message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor={typeId}
              className="block text-xs font-medium text-[var(--ink-secondary)] mb-1"
            >
              Item Type
            </label>
            <select
              id={typeId}
              value={type}
              onChange={(e) =>
                setType(e.target.value as "canvas" | "document" | "folder")
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none"
            >
              <option value="canvas">🎨 Excalidraw Canvas</option>
              <option value="document">📄 Rich Text Document</option>
              <option value="folder">📁 Folder</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={nameId}
              className="block text-xs font-medium text-[var(--ink-secondary)] mb-1"
            >
              Name
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "folder"
                  ? "e.g., Architecture Specs"
                  : type === "canvas"
                    ? "e.g., System Design V1"
                    : "e.g., API Documentation"
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none"
            />
          </div>

          <div>
            <label
              htmlFor={folderSelectId}
              className="block text-xs font-medium text-[var(--ink-secondary)] mb-1"
            >
              Destination Folder
            </label>
            <select
              id={folderSelectId}
              value={folderId ?? ""}
              onChange={(e) =>
                setFolderId(e.target.value ? e.target.value : null)
              }
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none"
            >
              <option value="">(Project Root)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
