"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { navGroups } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 px-5 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Logo height={24} className="max-w-[168px]" />
          </div>
          <button
            className="lg:hidden text-text-secondary"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              {group.label && (
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname?.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex min-h-10 items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[14px] font-medium leading-5 transition-[background-color,color,transform] duration-200",
                          isActive
                            ? "bg-primary-surface font-medium text-primary shadow-[inset_3px_0_0_var(--primary)]"
                            : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            size={17}
                            strokeWidth={2.1}
                            className={cn(
                              isActive ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"
                            )}
                          />
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-tertiary">
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

        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] font-medium text-text-tertiary">Powered by Zoraak Technologies</p>
        </div>
      </aside>
    </>
  );
}
