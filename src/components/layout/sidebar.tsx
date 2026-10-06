"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { navGroups } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));

/**
 * A nav item is active on its own route and its nested routes — unless a more specific
 * nav item owns the current path (e.g. "/analytics" must not light up on "/analytics/campaigns").
 */
function isActiveRoute(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  return !allHrefs.some(
    (other) => other !== href && other.startsWith(href + "/") && (pathname === other || pathname.startsWith(other + "/"))
  );
}

export function Sidebar({
  mobileOpen,
  onClose,
  workspaceName,
  planName,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
  workspaceName: string;
  planName: string;
}) {
  const pathname = usePathname();

  // Lock page scroll behind the open mobile drawer and close it on Escape.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, onClose]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "app-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(288px,86vw)] shrink-0 flex-col lg:w-[240px] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-[66px] shrink-0 items-center justify-between gap-2 px-6">
          <Link href="/dashboard" aria-label="Zendmail dashboard" onClick={onClose}>
            <Logo height={24} variant="onDark" priority />
          </Link>
          <button
            className="text-[#9DB6E0] hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 pb-6 pt-2" aria-label="Main">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {group.label && (
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8FA9D8]">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = isActiveRoute(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={isActive ? "page" : undefined}
                        className="app-nav-link group flex min-h-[36px] items-center justify-between gap-2 rounded-[10px] px-3 py-1.5 text-[13.5px] font-semibold leading-5 transition-[background-color,color,box-shadow] duration-200"
                      >
                        <span className="flex items-center gap-3">
                          <Icon
                            size={18}
                            strokeWidth={1.9}
                            className={cn(isActive ? "text-white" : "text-[#A9C0E8] group-hover:text-white")}
                          />
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#C9D9F5]">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 px-4 pb-4">
          <Link
            href="/workspace/settings"
            onClick={onClose}
            className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-[#0C2D5F]/80 px-3.5 py-3 backdrop-blur transition-colors hover:bg-[#10396F]"
            aria-label="Workspace settings"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A63FF] text-[14px] font-semibold text-white shadow-[0_4px_10px_rgb(10_99_255/0.45)]">
              {workspaceName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-white">{workspaceName}</span>
              <span className="mt-0.5 block text-[12px] text-[#A9C0E8]">{planName} Plan</span>
            </span>
            <ChevronsUpDown size={15} className="shrink-0 text-[#A9C0E8]" />
          </Link>
        </div>
      </aside>
    </>
  );
}
