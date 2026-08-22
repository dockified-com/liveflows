import { type RefObject, useEffect, useState } from "react";

export interface UseToolbarOverflowOptions {
  /** Approximate width per button in px, including gap/separator (default: 32) */
  itemWidth?: number;
  /** Reserved width for the "More" overflow button in px (default: 40) */
  reserveWidth?: number;
  /** Total number of items (default: 14) */
  totalItems?: number;
}

export function useToolbarOverflow(
  ref: RefObject<HTMLElement | null>,
  options: UseToolbarOverflowOptions = {},
): { visibleCount: number } {
  const { itemWidth = 32, reserveWidth = 40, totalItems = 14 } = options;
  const [visibleCount, setVisibleCount] = useState<number>(Infinity);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const element = ref.current;
    if (!element) return;

    const calculateVisible = (width: number) => {
      if (width <= 0) return;
      if (width >= totalItems * itemWidth) {
        setVisibleCount(totalItems);
        return;
      }
      const available = Math.max(0, width - reserveWidth);
      const count = Math.floor(available / itemWidth);
      const clamped = Math.max(1, Math.min(totalItems - 1, count));
      setVisibleCount(clamped);
    };

    if (element.clientWidth > 0) {
      calculateVisible(element.clientWidth);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width =
          entry.contentRect?.width ?? (entry.target as HTMLElement).clientWidth;
        if (typeof width === "number" && !Number.isNaN(width)) {
          calculateVisible(width);
        }
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, itemWidth, reserveWidth, totalItems]);

  if (typeof ResizeObserver === "undefined") {
    return { visibleCount: Infinity };
  }

  return { visibleCount };
}
