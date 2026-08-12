import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: "sm" | "md" | "lg" | number;
  strokeWidth?: number;
  label?: string;
  active?: boolean;
}

const sizeMap = {
  sm: 16,
  md: 18,
  lg: 20,
};

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = "md",
      strokeWidth = 1.5,
      label,
      active = false,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const dimension = typeof size === "number" ? size : sizeMap[size] || 18;

    return (
      <svg
        ref={ref}
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={!label}
        aria-label={label}
        role={label ? "img" : undefined}
        className={`inline-block transition-colors ${
          active ? "text-[var(--accent)]" : ""
        } ${className}`}
        {...props}
      >
        {label ? <title>{label}</title> : null}
        {children}
      </svg>
    );
  },
);

Icon.displayName = "Icon";
