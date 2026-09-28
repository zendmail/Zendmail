import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-text-primary">
        {label}
      </label>
      {children}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[11px] border border-border bg-surface px-3.5 text-[15px] font-medium text-text-primary placeholder:text-text-tertiary outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[var(--shadow-focus-primary)]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-[var(--radius-sm)] bg-danger-surface px-3 py-2.5 text-[13px] text-danger">
      {message}
    </div>
  );
}

export function SuccessBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-[var(--radius-sm)] bg-success-surface px-3 py-2.5 text-[13px] text-success">
      {message}
    </div>
  );
}
