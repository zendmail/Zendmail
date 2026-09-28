"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RouteTransition } from "@/components/layout/route-transition";

export function AppShell({
  children,
  workspaceName,
  planName,
}: {
  children: React.ReactNode;
  workspaceName: string;
  planName: string;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          workspaceName={workspaceName}
          planName={planName}
        />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
    </div>
  );
}
