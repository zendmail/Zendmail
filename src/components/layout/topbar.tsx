"use client";

import * as React from "react";
import { Menu, Search, Bell } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";

export function Topbar({
  onMenuClick,
  userName,
  planName,
}: {
  onMenuClick?: () => void;
  userName: string;
  planName: string;
}) {
  const searchRef = React.useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses the search box, matching the hint shown inside it.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[66px] items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-5">
      <button className="text-text-secondary lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <label className="hidden h-[42px] w-[min(463px,42vw)] items-center gap-2.5 rounded-[12px] border border-border bg-surface-secondary/70 px-3.5 text-text-tertiary focus-within:border-primary/40 focus-within:bg-surface lg:flex">
        <Search size={16} />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search contacts, campaigns, templates..."
          className="w-full bg-transparent text-[13px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
        />
        <kbd className="flex shrink-0 items-center gap-0.5 rounded-[6px] border border-border bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-text-tertiary">
          ⌘ K
        </kbd>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-[10px] text-text-secondary hover:bg-surface-secondary"
          aria-label="Notifications"
        >
          <Bell size={19} strokeWidth={1.9} />
          <span className="absolute right-[11px] top-[9px] h-2 w-2 rounded-full border-2 border-surface bg-danger" />
        </button>
        <UserMenu userName={userName} planName={planName} />
      </div>
    </header>
  );
}
