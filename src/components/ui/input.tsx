import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-[var(--ink)]"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 text-[13.5px] bg-[var(--card)] text-[var(--ink)] border rounded-lg transition-colors placeholder:text-[var(--ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] focus:border-[var(--accent)] ${
            error
              ? "border-[var(--destructive)] focus:ring-red-100"
              : "border-[var(--line)]"
          } ${className}`}
          {...props}
        />
        {error ? (
          <span className="text-[12px] text-[var(--destructive)]">{error}</span>
        ) : helperText ? (
          <span className="text-[12px] text-[var(--ink-faint)]">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
