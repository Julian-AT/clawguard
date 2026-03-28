"use client";

import type * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export type DashboardUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type DashboardRepo = { owner: string; repo: string };

export function DashboardShell({
  children,
  user,
  repos,
}: {
  children: React.ReactNode;
  user: DashboardUser;
  repos: DashboardRepo[];
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 56)",
          "--sidebar-width-icon": "3rem",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <AppSidebar repos={repos} user={user} />
      <SidebarInset className="overflow-x-hidden">
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
