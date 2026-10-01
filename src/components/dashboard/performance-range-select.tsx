"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

const OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

/** Drives the dashboard's `?range=` search param so the chart is filtered on the server. */
export function PerformanceRangeSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Time range</span>
      <select
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("range", e.target.value);
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="h-10 cursor-pointer appearance-none rounded-[10px] border border-border bg-surface py-0 pl-3.5 pr-9 text-[13px] font-semibold text-text-primary outline-none hover:border-border-strong focus-visible:border-primary/50"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 text-text-secondary" />
    </label>
  );
}
