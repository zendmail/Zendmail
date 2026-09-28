"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Users, Building2, CreditCard, Flag, AlertTriangle, ScrollText, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/admin", icon: ShieldCheck },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Workspaces", href: "/admin/workspaces", icon: Building2 },
  { label: "Plans", href: "/admin/plans", icon: CreditCard },
  { label: "Feature flags", href: "/admin/feature-flags", icon: Flag },
  { label: "Security", href: "/admin/security", icon: AlertTriangle },
  { label: "Audit logs", href: "/admin/audit-logs", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-[#0B0F14] text-[#F5F7FA]">
      <div className="flex h-14 items-center gap-2 border-b border-[#27313E] px-5">
        <ShieldCheck size={17} className="text-amber-400" />
        <span className="text-[14px] font-semibold tracking-tight">Zendmail Admin</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-[13px] font-medium transition-colors",
                isActive ? "bg-white/10 text-white" : "text-[#98A2B3] hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#27313E] p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-[6px] px-3 py-2 text-[13px] font-medium text-[#98A2B3] hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft size={14} />
          Back to app
        </Link>
        <p className="mt-2 px-3 text-[10.5px] text-[#6B7686]">Powered by Zoraak Technologies</p>
      </div>
    </aside>
  );
}
