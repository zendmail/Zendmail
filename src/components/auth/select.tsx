import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-[13.5px] text-text-primary outline-none transition-colors focus:border-primary",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
