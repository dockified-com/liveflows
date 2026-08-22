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
  folders = [],
}: CreateItemDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"canvas" | "document" | "folder">(
    initialType,
  );
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameId = useId();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2
              id="create-dialog-title"
              className="text-base font-semibold text-slate-900"
            >
              Create New Item
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add a new asset or directory to your project.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <Icon size="sm">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </Icon>
          </button>
        </div>

        {error && <InlineError message={error} />}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Custom Card-style Selector for Item Type */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Item Type
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Canvas Card */}
              <button
                type="button"
                onClick={() => setType("canvas")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  type === "canvas"
                    ? "border-blue-600 bg-blue-50/40 text-blue-900 ring-2 ring-blue-500/10"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`p-2 rounded-md ${
                    type === "canvas"
                      ? "bg-blue-100/80 text-blue-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="8.5" cy="14" r="1.5" />
                    <circle cx="15.5" cy="14" r="1.5" />
                    <circle cx="12" cy="9" r="1.5" />
                  </svg>
                </span>
                <span className="mt-2 text-xs font-medium">Canvas</span>
              </button>

              {/* Document Card */}
              <button
                type="button"
                onClick={() => setType("document")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  type === "document"
                    ? "border-violet-600 bg-violet-50/40 text-violet-900 ring-2 ring-violet-500/10"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`p-2 rounded-md ${
                    type === "document"
                      ? "bg-violet-100/80 text-violet-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                    />
                  </svg>
                </span>
                <span className="mt-2 text-xs font-medium">Document</span>
              </button>

              {/* Folder Card */}
              <button
                type="button"
                onClick={() => setType("folder")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  type === "folder"
                    ? "border-amber-600 bg-amber-50/40 text-amber-900 ring-2 ring-amber-500/10"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`p-2 rounded-md ${
                    type === "folder"
                      ? "bg-amber-100/80 text-amber-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                    />
                  </svg>
                </span>
                <span className="mt-2 text-xs font-medium">Folder</span>
              </button>
            </div>
          </div>

          {/* Item Name Input */}
          <div className="space-y-1.5">
            <label
              htmlFor={nameId}
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
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
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            />
          </div>

          {/* Destination Folder Dropdown */}
          <div className="space-y-1.5">
            <label
              htmlFor={folderSelectId}
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Destination Folder
            </label>
            <div className="relative">
              <select
                id={folderSelectId}
                value={folderId ?? ""}
                onChange={(e) =>
                  setFolderId(e.target.value ? e.target.value : null)
                }
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3.5 py-3 pr-10 text-sm font-medium text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
              >
                <option value="">📁 (Project Root)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
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
