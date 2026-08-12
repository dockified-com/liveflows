import type React from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] ${className}`}
    >
      {icon ? <div className="mb-3 text-[var(--ink-faint)]">{icon}</div> : null}
      <h3 className="text-[15px] font-semibold text-[var(--ink)] mb-1">
        {title}
      </h3>
      {description ? (
        <p className="text-[13.5px] text-[var(--ink-faint)] max-w-sm mb-4">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
};
