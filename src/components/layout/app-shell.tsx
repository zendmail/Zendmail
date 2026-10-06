"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RouteTransition } from "@/components/layout/route-transition";

export function AppShell({
  children,
  workspaceName,
  planName,
  userName,
}: {
  children: React.ReactNode;
  workspaceName: string;
  planName: string;
  userName: string;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        workspaceName={workspaceName}
        planName={planName}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} userName={userName} planName={planName} />
        <main className="min-w-0 flex-1 px-3.5 py-4 sm:px-4 sm:py-6 lg:px-5 lg:py-5">
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
    </div>
  );
}
