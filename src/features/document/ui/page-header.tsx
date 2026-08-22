"use client";

import type React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export interface CoverPreset {
  id: string;
  name: string;
  gradient: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: "slate",
    name: "Nordic Slate",
    gradient: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
  },
  {
    id: "sunset",
    name: "Sunset Rose",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)",
  },
  {
    id: "ocean",
    name: "Ocean Breeze",
    gradient: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
  },
  {
    id: "emerald",
    name: "Emerald Forest",
    gradient: "linear-gradient(135deg, #059669 0%, #34d399 100%)",
  },
  {
    id: "violet",
    name: "Cosmic Violet",
    gradient: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  },
  {
    id: "amber",
    name: "Warm Amber",
    gradient: "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)",
  },
  {
    id: "mist",
    name: "Nordic Mist",
    gradient: "linear-gradient(135deg, #475569 0%, #94a3b8 100%)",
  },
  {
    id: "dark-indigo",
    name: "Deep Indigo",
    gradient: "linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)",
  },
];

export const POPULAR_EMOJIS = [
  "📄",
  "📝",
  "💡",
  "🚀",
  "⚡",
  "📐",
  "🎯",
  "🏗️",
  "☕",
  "🔍",
  "📊",
  "🛠️",
  "🎨",
  "🌐",
  "📦",
  "💻",
  "🔐",
  "📋",
  "📚",
  "✨",
  "🧠",
  "🧭",
  "📈",
  "💬",
  "🧪",
  "🔮",
  "🔑",
  "🛡️",
  "🔥",
  "🌿",
  "⭐",
  "🤖",
];

export interface PageHeaderProps {
  title?: string;
  onTitleChange?: (newTitle: string) => void;
  icon?: string | null;
  onIconChange?: (newIcon: string | null) => void;
  cover?: string | null;
  onCoverChange?: (newCover: string | null) => void;
  readOnly?: boolean;
}

export function PageHeader({
  title = "Untitled",
  onTitleChange,
  icon: controlledIcon = "📄",
  onIconChange,
  cover: controlledCover = null,
  onCoverChange,
  readOnly = false,
}: PageHeaderProps) {
  const [internalTitle, setInternalTitle] = useState(title);
  const [icon, setIcon] = useState<string | null>(controlledIcon);
  const [cover, setCover] = useState<string | null>(controlledCover);

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);

  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const coverButtonRef = useRef<HTMLButtonElement>(null);
  const coverPanelRef = useRef<HTMLDivElement>(null);

  const uniqueId = useId();

  useEffect(() => {
    setInternalTitle(title);
  }, [title]);

  useEffect(() => {
    setIcon(controlledIcon);
  }, [controlledIcon]);

  useEffect(() => {
    setCover(controlledCover);
  }, [controlledCover]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalTitle(val);
    onTitleChange?.(val);
  };

  const handleSelectEmoji = useCallback(
    (emojiChar: string) => {
      setIcon(emojiChar);
      onIconChange?.(emojiChar);
      setIsEmojiPickerOpen(false);
    },
    [onIconChange],
  );

  const handleRemoveIcon = useCallback(() => {
    setIcon(null);
    onIconChange?.(null);
    setIsEmojiPickerOpen(false);
  }, [onIconChange]);

  const handleSelectCover = useCallback(
    (gradient: string) => {
      setCover(gradient);
      onCoverChange?.(gradient);
      setIsCoverPickerOpen(false);
    },
    [onCoverChange],
  );

  const handleRemoveCover = useCallback(() => {
    setCover(null);
    onCoverChange?.(null);
    setIsCoverPickerOpen(false);
  }, [onCoverChange]);

  // Click outside listener for emoji picker
  useEffect(() => {
    if (!isEmojiPickerOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        emojiPanelRef.current &&
        !emojiPanelRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isEmojiPickerOpen]);

  // Click outside listener for cover picker
  useEffect(() => {
    if (!isCoverPickerOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        coverPanelRef.current &&
        !coverPanelRef.current.contains(e.target as Node) &&
        coverButtonRef.current &&
        !coverButtonRef.current.contains(e.target as Node)
      ) {
        setIsCoverPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isCoverPickerOpen]);

  return (
    <div className="group/header relative w-full select-none">
      {/* Cover Image Banner */}
      {cover ? (
        <div
          className="relative h-40 sm:h-48 w-full rounded-xl overflow-hidden mb-6 transition-all duration-200"
          style={{ background: cover }}
        >
          {!readOnly && (
            <div className="absolute right-3 bottom-3 flex items-center gap-1.5 opacity-0 transition-opacity group-hover/header:opacity-100">
              <Button
                ref={coverButtonRef}
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsCoverPickerOpen((prev) => !prev)}
                className="h-7 gap-1 bg-black/60 text-white backdrop-blur-xs hover:bg-black/80 hover:text-white border-transparent text-xs"
              >
                <Icon size="sm">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </Icon>
                <span>Change cover</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={handleRemoveCover}
                className="h-7 gap-1 bg-black/60 text-white backdrop-blur-xs hover:bg-red-600/80 hover:text-white border-transparent text-xs"
              >
                <Icon size="sm">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </Icon>
                <span>Remove</span>
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {/* Cover Picker Popover */}
      {isCoverPickerOpen && (
        <div
          ref={coverPanelRef}
          role="dialog"
          aria-label="Choose cover"
          className="absolute right-4 top-36 z-50 w-72 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-xl"
        >
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
            Color & Gradients
          </div>
          <div className="grid grid-cols-2 gap-2">
            {COVER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectCover(preset.gradient)}
                className="group relative flex h-14 w-full flex-col justify-end overflow-hidden rounded-lg p-1.5 text-left text-[11px] font-medium text-white shadow-xs transition-transform hover:scale-102 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                style={{ background: preset.gradient }}
              >
                <span className="drop-shadow-md truncate">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header Container */}
      <div className={`relative px-1 ${cover ? "-mt-10 sm:-mt-12" : "pt-2"}`}>
        {/* Quick action bar on hover if no cover or no icon */}
        {!readOnly && (!cover || !icon) && (
          <div className="mb-2 flex items-center gap-2 opacity-0 transition-opacity group-hover/header:opacity-100">
            {!icon && (
              <button
                type="button"
                onClick={() => handleSelectEmoji("📄")}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--ink)] cursor-pointer"
              >
                <span>😀</span>
                <span>Add icon</span>
              </button>
            )}
            {!cover && (
              <button
                type="button"
                onClick={() => handleSelectCover(COVER_PRESETS[0].gradient)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--ink)] cursor-pointer"
              >
                <Icon size="sm">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </Icon>
                <span>Add cover</span>
              </button>
            )}
          </div>
        )}

        {/* Emoji Icon Badge */}
        {icon ? (
          <div className="relative inline-block mb-3">
            <button
              ref={emojiButtonRef}
              type="button"
              disabled={readOnly}
              aria-label="Change icon"
              aria-expanded={isEmojiPickerOpen}
              onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
              className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[var(--card)] text-3xl sm:text-4xl shadow-sm border border-[var(--line)] transition-transform hover:scale-105 select-none ${
                readOnly ? "cursor-default" : "cursor-pointer"
              }`}
            >
              {icon}
            </button>

            {/* Emoji Picker Popover */}
            {isEmojiPickerOpen && (
              <div
                ref={emojiPanelRef}
                role="dialog"
                aria-label="Choose icon"
                className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-xl"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
                    Pick an emoji
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveIcon}
                    className="text-[11px] text-[var(--destructive)] hover:underline cursor-pointer"
                  >
                    Remove icon
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto p-1">
                  {POPULAR_EMOJIS.map((emojiChar) => (
                    <button
                      key={emojiChar}
                      type="button"
                      onClick={() => handleSelectEmoji(emojiChar)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-[var(--bg-2)] transition-colors cursor-pointer"
                    >
                      {emojiChar}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Page Title */}
        <div className="mb-4">
          {readOnly ? (
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ink)]">
              {internalTitle || "Untitled"}
            </h1>
          ) : (
            <input
              type="text"
              value={internalTitle}
              onChange={handleTitleChange}
              placeholder="Untitled"
              aria-label="Document Title"
              className="w-full bg-transparent text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none border-none p-0 selection:bg-[var(--accent-soft)]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
