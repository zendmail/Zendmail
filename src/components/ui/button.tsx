import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-text-on hover:bg-primary-hover shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] focus-visible:shadow-[var(--shadow-focus-primary)]",
  secondary:
    "bg-surface text-text-primary border border-border hover:bg-surface-secondary hover:border-border-strong",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
  danger:
    "bg-danger text-white hover:opacity-90 shadow-[var(--shadow-xs)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-10 px-5 text-sm gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-[12px] font-semibold transition-[background-color,box-shadow,border-color,transform] duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap active:translate-y-px hover:-translate-y-px",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
