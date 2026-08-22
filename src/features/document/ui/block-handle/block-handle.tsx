"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  blockLinkFor,
  deleteBlock,
  duplicateBlock,
  turnInto,
} from "./block-actions";
import { BlockMenu } from "./block-menu";
import { type BlockTarget, blockAtCoords, moveBlock } from "./pos-at-coords";

export interface BlockHandleProps {
  editor: Editor;
  initialTarget?: BlockTarget | null;
}

export function BlockHandle({
  editor,
  initialTarget = null,
}: BlockHandleProps) {
  const [target, setTarget] = useState<BlockTarget | null>(initialTarget);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeBlock, setActiveBlock] = useState<BlockTarget | null>(null);
  const [handlePosition, setHandlePosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  const handleButtonRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef<number | null>(null);

  const uniqueId = useId();
  const menuId = `block-menu-${uniqueId}`;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (initialTarget !== undefined) {
      setTarget(initialTarget);
    }
  }, [initialTarget]);

  const updatePositionForTarget = useCallback(
    (blockTarget: BlockTarget) => {
      const viewDom = editor?.view?.dom;
      const container = viewDom
        ? (viewDom.closest(".relative") ?? viewDom.parentElement ?? viewDom)
        : null;

      if (!container || !blockTarget.domEl) return;

      const containerRect = container.getBoundingClientRect();
      const elRect = blockTarget.domEl.getBoundingClientRect();

      const top =
        elRect.top - (containerRect?.top ?? 0) + (container?.scrollTop ?? 0);
      const left = Math.max(
        0,
        elRect.left -
          (containerRect?.left ?? 0) +
          (container?.scrollLeft ?? 0) -
          24,
      );

      setHandlePosition({ top, left });
    },
    [editor],
  );

  useEffect(() => {
    if (target) {
      updatePositionForTarget(target);
    }
  }, [target, updatePositionForTarget]);

  useEffect(() => {
    const viewDom = editor?.view?.dom;
    if (!viewDom) return;

    const container =
      viewDom.closest(".relative") ?? viewDom.parentElement ?? viewDom;

    const handlePointerMove = (e: PointerEvent) => {
      if (isMenuOpen) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const block = blockAtCoords(editor.view, {
          x: e.clientX,
          y: e.clientY,
        });

        if (!block) {
          if (!isMenuOpen) {
            setTarget(null);
          }
          return;
        }

        setTarget(block);
        updatePositionForTarget(block);
      });
    };

    const handlePointerLeave = () => {
      if (!isMenuOpen) {
        setTarget(null);
      }
    };

    container.addEventListener(
      "pointermove",
      handlePointerMove as EventListener,
    );
    container.addEventListener(
      "pointerleave",
      handlePointerLeave as EventListener,
    );

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      container.removeEventListener(
        "pointermove",
        handlePointerMove as EventListener,
      );
      container.removeEventListener(
        "pointerleave",
        handlePointerLeave as EventListener,
      );
    };
  }, [editor, isMenuOpen, updatePositionForTarget]);

  const handleDragStart = (_event: DragStartEvent) => {
    if (target) {
      setActiveBlock(target);
    }
  };

  const handleDragCancel = () => {
    setActiveBlock(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta } = event;
    setActiveBlock(null);

    if (!target) return;
    const fromPos = target.pos;

    const activator = event.activatorEvent as
      | MouseEvent
      | PointerEvent
      | undefined;
    if (activator && typeof activator.clientX === "number") {
      const dropX = activator.clientX + (delta?.x ?? 0);
      const dropY = activator.clientY + (delta?.y ?? 0);

      const overTarget = blockAtCoords(editor.view, { x: dropX, y: dropY });
      if (overTarget) {
        const elRect = overTarget.domEl.getBoundingClientRect();
        const isLowerHalf = dropY > elRect.top + elRect.height / 2;
        const toPos = isLowerHalf
          ? overTarget.pos + overTarget.node.nodeSize
          : overTarget.pos;

        if (fromPos !== toPos) {
          moveBlock(editor.view, fromPos, toPos);
        }
      }
    }
  };

  if (!target && !activeBlock) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      {target && (
        <div
          data-testid="block-handle-container"
          style={{
            position: "absolute",
            top: `${handlePosition.top}px`,
            left: `${handlePosition.left}px`,
          }}
          className="z-30 inline-flex flex-col items-start"
        >
          <button
            ref={handleButtonRef}
            type="button"
            tabIndex={0}
            aria-label="Block options"
            aria-expanded={isMenuOpen}
            aria-controls={menuId}
            aria-haspopup="menu"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={`flex h-6 w-5 items-center justify-center rounded text-sm transition-colors cursor-grab active:cursor-grabbing select-none font-mono ${
              isMenuOpen
                ? "bg-[var(--bg-2)] text-[var(--ink)]"
                : "text-[var(--ink-faint)] hover:bg-[var(--bg-2)] hover:text-[var(--ink-soft)]"
            }`}
          >
            ⠿
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-40">
              <BlockMenu
                id={menuId}
                hasBlockId={Boolean(target.node.attrs?.id)}
                onDuplicate={() => {
                  duplicateBlock(editor.view, target.pos);
                  setIsMenuOpen(false);
                }}
                onDelete={() => {
                  deleteBlock(editor.view, target.pos);
                  setIsMenuOpen(false);
                  setTarget(null);
                }}
                onTurnInto={(t) => {
                  turnInto(editor.view, target.pos, t);
                  setIsMenuOpen(false);
                }}
                onCopyLink={() => {
                  const link = blockLinkFor(target.node);
                  if (
                    link &&
                    typeof navigator !== "undefined" &&
                    navigator.clipboard
                  ) {
                    const fullUrl = `${window.location.origin}${window.location.pathname}${link}`;
                    navigator.clipboard.writeText(fullUrl);
                  }
                  setIsMenuOpen(false);
                }}
                onClose={() => {
                  setIsMenuOpen(false);
                  handleButtonRef.current?.focus();
                }}
              />
            </div>
          )}
        </div>
      )}

      {typeof window !== "undefined" &&
        createPortal(
          <DragOverlay dropAnimation={null}>
            {activeBlock ? (
              <div className="flex max-w-sm items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-xs font-sans text-[var(--ink)] shadow-md opacity-90 pointer-events-none select-none truncate">
                <span className="text-[var(--ink-faint)]">⠿</span>
                <span className="truncate">
                  {activeBlock.node.textContent || "Empty block"}
                </span>
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}
