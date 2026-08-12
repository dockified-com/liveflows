import type React from "react";

export interface InlineErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  title = "An error occurred",
  message,
  onRetry,
  className = "",
}) => {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-lg border border-red-200 bg-[var(--destructive-soft)] text-[var(--destructive)] text-[13px] ${className}`}
    >
      <svg
        className="w-4 h-4 mt-0.5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
        role="img"
        aria-label="Error alert icon"
      >
        <title>Error alert icon</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div className="flex-1">
        <div className="font-semibold text-red-900 mb-0.5">{title}</div>
        <div className="text-red-700">{message}</div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-[12px] font-medium underline text-red-800 hover:text-red-950 cursor-pointer ml-2"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
};
