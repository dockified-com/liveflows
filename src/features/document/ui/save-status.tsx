import { StatusPill } from "@/components/ui/status-pill";
import type { ProviderStatus } from "../collaboration-provider";

export interface SaveStatusProps {
  status: ProviderStatus;
  readOnly?: boolean;
  className?: string;
}

export function SaveStatus({
  status,
  readOnly = false,
  className = "",
}: SaveStatusProps) {
  let pillStatus: "synced" | "reconnecting" | "disconnected" | "custom" =
    "synced";
  let label = "Saved";
  let customClass = "";

  if (readOnly) {
    pillStatus = "custom";
    label = "Read-only";
  } else {
    switch (status) {
      case "connecting":
        pillStatus = "custom";
        label = "Saving…";
        customClass = "text-[var(--ink-faint)]";
        break;
      case "connected":
        pillStatus = "synced";
        label = "Saved";
        break;
      case "disconnected":
      case "failed":
        pillStatus = "disconnected";
        label = "Connection lost";
        break;
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`inline-flex shrink-0 ${className}`}
    >
      <StatusPill status={pillStatus} label={label} className={customClass} />
    </div>
  );
}
