import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium font-sans rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2";

    const variantStyles = {
      primary:
        "bg-[var(--accent)] text-white border border-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-[0_1px_2px_rgba(37,99,235,0.2)]",
      secondary:
        "bg-[var(--card)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--bg-2)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
      ghost:
        "bg-transparent text-[var(--ink-soft)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]",
      destructive:
        "bg-[var(--destructive)] text-white border border-[var(--destructive)] hover:bg-red-700 shadow-[0_1px_2px_rgba(220,38,38,0.2)]",
    };

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5 h-8",
      md: "text-[13px] px-3.5 py-2 gap-2 h-9",
      lg: "text-sm px-4 py-2.5 gap-2.5 h-10",
    };

    return (
      <button
        ref={ref}
        type={props.type || "button"}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
