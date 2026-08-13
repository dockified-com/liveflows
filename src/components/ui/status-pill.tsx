import type React from "react";

export interface StatusPillProps {
  status?: "synced" | "reconnecting" | "disconnected" | "custom";
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status = "synced",
  label,
  className = "",
  children,
}) => {
  const config = {
    synced: {
      bg: "bg-[var(--success-soft)]",
      text: "text-[var(--success)]",
      dot: "bg-[var(--success)]",
      defaultLabel: "Synced",
      pulse: false,
    },
    reconnecting: {
      bg: "bg-[var(--warn-soft)]",
      text: "text-[var(--warn)]",
      dot: "bg-[var(--warn)]",
      defaultLabel: "Reconnecting",
      pulse: true,
    },
    disconnected: {
      bg: "bg-[var(--destructive-soft)]",
      text: "text-[var(--destructive)]",
      dot: "bg-[var(--destructive)]",
      defaultLabel: "Offline",
      pulse: false,
    },
    custom: {
      bg: "bg-[var(--bg-2)]",
      text: "text-[var(--ink-soft)]",
      dot: "bg-[var(--ink-faint)]",
      defaultLabel: "",
      pulse: false,
    },
  };

  const current = config[status];
  const displayLabel = label || children || current.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full ${current.bg} ${current.text} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${current.dot} ${
          current.pulse ? "animate-pulse" : ""
        }`}
      />
      {displayLabel}
    </span>
  );
};
