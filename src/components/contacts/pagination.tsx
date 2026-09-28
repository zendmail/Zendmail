import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3">
      <p className="text-[12.5px] text-text-tertiary">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-1.5">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-border text-text-secondary hover:bg-surface-secondary ${
            page <= 1 ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <ChevronLeft size={14} />
        </Link>
        <Link
          href={buildHref(Math.min(pageCount, page + 1))}
          aria-disabled={page >= pageCount}
          className={`flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-border text-text-secondary hover:bg-surface-secondary ${
            page >= pageCount ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
