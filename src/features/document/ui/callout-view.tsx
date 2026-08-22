import type { NodeViewProps } from "@tiptap/react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { CalloutVariant } from "../extensions/callout";
import { DEFAULT_CALLOUT_EMOJI } from "../extensions/callout";

const VARIANT_STYLES: Record<
  CalloutVariant,
  { container: string; icon: string }
> = {
  info: {
    container: "bg-[var(--accent-soft)] border-[var(--accent)]",
    icon: "text-[var(--accent)]",
  },
  warning: {
    container: "bg-[var(--warn-soft)] border-[var(--warn)]",
    icon: "text-[var(--warn)]",
  },
  success: {
    container: "bg-[var(--success-soft)] border-[var(--success)]",
    icon: "text-[var(--success)]",
  },
  danger: {
    container: "bg-[var(--destructive-soft)] border-[var(--destructive)]",
    icon: "text-[var(--destructive)]",
  },
};

export function CalloutView({ node }: NodeViewProps) {
  const variant = (node.attrs.variant as CalloutVariant) || "info";
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info;
  const emoji = node.attrs.emoji ?? DEFAULT_CALLOUT_EMOJI[variant] ?? "💡";

  return (
    <NodeViewWrapper
      as="div"
      role="note"
      aria-label={`${variant} callout`}
      data-type="callout"
      data-variant={variant}
      className={`my-3 flex items-start gap-3 rounded-lg border-l-4 p-3.5 text-sm text-[var(--ink)] ${styles.container}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 select-none items-center justify-center leading-none ${styles.icon}`}
        contentEditable={false}
        aria-hidden="true"
      >
        {emoji}
      </span>
      <NodeViewContent className="min-w-0 flex-1 leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
    </NodeViewWrapper>
  );
}
