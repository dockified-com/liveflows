import type { Editor } from "@tiptap/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../../../components/ui/icon";
import { getFindState } from "../extensions/find";

export interface FindBarProps {
  editor: Editor;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function FindBar({
  editor,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onClose,
}: FindBarProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalOpen;

  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [findState, setFindState] = useState(() => getFindState(editor));

  const setOpen = useCallback(
    (val: boolean) => {
      if (!isControlled) {
        setInternalOpen(val);
      }
      if (!val) {
        onClose?.();
      }
    },
    [isControlled, onClose],
  );

  useEffect(() => {
    if (!editor?.on) return;
    const update = () => {
      setFindState(getFindState(editor));
    };
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  // Global Cmd/Ctrl+F listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setOpen]);

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open]);

  const scrollToMatch = () => {
    requestAnimationFrame(() => {
      if (!editor || editor.isDestroyed) return;
      try {
        if (editor.view?.dom) {
          const el = editor.view.dom.querySelector(".find-match-current");
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } catch {
        // Safe fallback if editor is not mounted or view is unavailable
      }
    });
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    editor.commands.setFindQuery(newQuery);
    scrollToMatch();
  };

  const handleNext = () => {
    editor.commands.findNext();
    scrollToMatch();
  };

  const handlePrev = () => {
    editor.commands.findPrev();
    scrollToMatch();
  };

  const handleClose = () => {
    setOpen(false);
    setQuery("");
    if (editor && !editor.isDestroyed) {
      editor.commands.clearFind();
      editor.commands.focus();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  if (!open) return null;

  const matchCount = findState?.matches.length ?? 0;
  const currentIndex = findState?.currentIndex ?? -1;
  const counterText =
    matchCount === 0 ? "0 of 0" : `${currentIndex + 1} of ${matchCount}`;

  return (
    <div
      role="region"
      aria-label="Find bar"
      className="flex select-none items-center gap-2 border-b border-[var(--line)] bg-[var(--card)] px-4 py-2 text-sm shadow-xs"
    >
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleInputKeyDown}
          placeholder="Find in document..."
          aria-label="Find in document"
          className="h-8 w-56 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
        />
      </div>

      <span
        aria-live="polite"
        aria-atomic="true"
        className="min-w-[4rem] select-none text-center font-mono text-xs text-[var(--ink-soft)]"
      >
        {counterText}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handlePrev}
          disabled={matchCount === 0}
          aria-label="Previous match"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Icon size="sm" strokeWidth={2}>
            <polyline points="18 15 12 9 6 15" />
          </Icon>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={matchCount === 0}
          aria-label="Next match"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Icon size="sm" strokeWidth={2}>
            <polyline points="6 9 12 15 18 9" />
          </Icon>
        </button>
      </div>

      <button
        type="button"
        onClick={handleClose}
        aria-label="Close find"
        className="ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
      >
        <Icon size="sm" strokeWidth={2}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </Icon>
      </button>
    </div>
  );
}
