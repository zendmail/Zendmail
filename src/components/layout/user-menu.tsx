"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ChevronDown, LogOut, Moon, Settings, Sun } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth-actions";
import { formatPersonName } from "@/lib/utils";

export function UserMenu({ userName, planName }: { userName: string; planName: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- avoids a hydration mismatch with next-themes
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isDark = mounted && resolvedTheme === "dark";
  const shownName = formatPersonName(userName);
  const initial = shownName.trim().slice(0, 1).toUpperCase() || "Z";
  const displayName = shownName.split(/\s+/)[0] || shownName;

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium text-text-primary hover:bg-surface-secondary";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-[12px] py-1 pl-1.5 pr-2 hover:bg-surface-secondary"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#071B5E] text-[15px] font-semibold text-white">
          {initial}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[13.5px] font-semibold text-text-primary">{displayName}</span>
          <span className="block text-[11.5px] text-text-tertiary">{planName} Plan</span>
        </span>
        <ChevronDown size={15} className="hidden text-text-tertiary sm:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-[14px] border border-border bg-surface p-1.5 shadow-[var(--shadow-lg)]"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate text-[13px] font-semibold text-text-primary">{shownName}</p>
            <p className="text-[11.5px] text-text-tertiary">{planName} Plan</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link href="/workspace/settings" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <Settings size={15} className="text-text-tertiary" /> Workspace settings
          </Link>
          <button type="button" role="menuitem" className={itemClass} onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <Sun size={15} className="text-text-tertiary" /> : <Moon size={15} className="text-text-tertiary" />}
            {isDark ? "Light mode" : "Dark mode"}
          </button>
          <form action={logoutAction}>
            <button type="submit" role="menuitem" className={`${itemClass} text-danger`}>
              <LogOut size={15} /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
