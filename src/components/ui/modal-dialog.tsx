import type React from "react";
import { useEffect } from "react";

export interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-dialog-title"
      aria-describedby={description ? "modal-dialog-description" : undefined}
    >
      <button
        type="button"
        tabIndex={-1}
        className="fixed inset-0 w-full h-full cursor-default bg-transparent border-0"
        onClick={onClose}
        aria-label="Close background"
      />
      <div
        className={`relative z-10 w-full bg-[var(--card)] rounded-xl border border-[var(--line)] shadow-xl p-6 text-[var(--ink)] ${maxWidthStyles[maxWidth]} animate-in zoom-in-95 duration-150`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2
              id="modal-dialog-title"
              className="text-[17px] font-semibold text-[var(--ink)]"
            >
              {title}
            </h2>
            {description ? (
              <p
                id="modal-dialog-description"
                className="text-[13.5px] text-[var(--ink-faint)] mt-1"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[var(--ink-faint)] hover:text-[var(--ink)] p-1 rounded-md hover:bg-[var(--bg-2)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {children ? <div className="py-2">{children}</div> : null}

        {footer ? (
          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--line)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};
