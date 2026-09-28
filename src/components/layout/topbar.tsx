"use client";

import { Menu, Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { logoutAction } from "@/lib/actions/auth-actions";

export function Topbar({
  onMenuClick,
  workspaceName,
  planName,
}: {
  onMenuClick?: () => void;
  workspaceName: string;
  planName: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-6">
      <button
        className="text-text-secondary lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="hidden w-[min(430px,42vw)] items-center gap-2 rounded-[11px] border border-border bg-surface-secondary/60 px-3.5 py-2 text-text-tertiary lg:flex">
        <Search size={15} />
        <input
          type="text"
          placeholder="Search contacts, campaigns..."
          className="w-full bg-transparent text-[13px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary hover:bg-surface-secondary"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
        </button>
        <button className="flex items-center gap-2 rounded-[var(--radius-sm)] pl-2 pr-1.5 py-1 hover:bg-surface-secondary">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-surface text-[12px] font-semibold text-primary">
            {workspaceName.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-[13px] font-medium text-text-primary">
              {workspaceName}
            </p>
            <p className="text-[11px] text-text-tertiary">{planName} plan</p>
          </div>
          <ChevronDown size={14} className="text-text-tertiary hidden sm:block" />
        </button>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-secondary hover:bg-surface-secondary"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
