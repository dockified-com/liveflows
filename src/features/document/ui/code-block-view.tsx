import type { NodeViewProps } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";
import { CODE_LANGUAGES } from "../extensions/technical-content";

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const currentLanguage = node.attrs.language || "";

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    updateAttributes({ language: value ? value : null });
  };

  const handleCopy = async () => {
    const text = node.textContent ?? "";
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or ignore clipboard errors in environments without clipboard support
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <NodeViewWrapper
      as="div"
      data-type="code-block"
      className="relative my-4 rounded-lg border border-[var(--line)] bg-[var(--bg-2)] overflow-hidden font-mono text-sm text-[var(--ink)]"
    >
      <div
        contentEditable={false}
        className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--ink-soft)] select-none"
      >
        <div className="flex items-center gap-2">
          <select
            aria-label="Code language"
            value={currentLanguage}
            onChange={handleLanguageChange}
            className="rounded border border-[var(--line)] bg-[var(--card)] px-2 py-0.5 text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="">Plain text</option>
            {CODE_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span aria-live="polite" className="sr-only">
            {copied ? "Code copied to clipboard" : ""}
          </span>
          <button
            type="button"
            aria-label="Copy code"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[var(--card)] px-2 py-0.5 text-xs text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
          >
            {copied ? (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <NodeViewContent<"pre">
        as="pre"
        className="p-3.5 overflow-x-auto text-[13px] leading-relaxed font-mono"
      />
    </NodeViewWrapper>
  );
}
