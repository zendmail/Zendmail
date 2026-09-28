import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border last:border-0 hover:bg-surface-secondary/60 transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function TableHeadCell({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "text-left text-xs font-medium uppercase tracking-wide text-text-tertiary px-4 py-3 border-b border-border",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3.5 text-text-primary", className)} {...props} />;
}
