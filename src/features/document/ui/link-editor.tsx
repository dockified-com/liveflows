"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface LinkEditorProps {
  initialUrl?: string;
  onApply: (url: string) => void;
  onRemove?: () => void;
  onCancel?: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function isValidLinkUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("data:")
  ) {
    return false;
  }

  // If protocol scheme is present (e.g., http:, https:, mailto:, ftp:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return /^(https?|mailto):/i.test(trimmed);
  }

  // Bare domains, relative paths, hashes are acceptable
  return true;
}

export function LinkEditor({
  initialUrl = "",
  onApply,
  onRemove,
  onCancel,
  triggerRef,
}: LinkEditorProps) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleClose = () => {
    onCancel?.();
    if (triggerRef?.current) {
      triggerRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidLinkUrl(trimmed)) {
      setError(
        "Invalid URL or unsupported protocol (use http, https, or mailto)",
      );
      return;
    }

    setError(null);
    onApply(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Edit link"
      className="flex flex-col gap-2 rounded-lg border border-[var(--line)] bg-[var(--card)] p-3 shadow-[0_4px_12px_rgba(15,23,42,0.08)] w-80 text-[var(--ink)]"
    >
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className="flex flex-col gap-2"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="link-editor-url"
            className="text-xs font-medium text-[var(--ink)]"
          >
            Link URL
          </label>
          <input
            ref={inputRef}
            id="link-editor-url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://example.com"
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "link-editor-error" : undefined}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          {error ? (
            <p
              id="link-editor-error"
              role="alert"
              className="text-xs text-[var(--destructive)]"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-1.5 pt-1">
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-xs text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
            >
              Remove
            </Button>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClose}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button type="submit" variant="primary" size="sm" className="text-xs">
            Apply
          </Button>
        </div>
      </form>
    </div>
  );
}
