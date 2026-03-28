"use client";

import {
  BookOpen,
  Brain,
  LayoutDashboard,
  LineChart,
  LogOut,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import type { DashboardRepo, DashboardUser } from "@/components/dashboard/dashboard-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

function initials(user: DashboardUser): string {
  const n = user.name?.trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      const a = parts[0]?.charAt(0) ?? "";
      const b = parts[1]?.charAt(0) ?? "";
      const two = `${a}${b}`.toUpperCase();
      return two || n.slice(0, 2).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const e = user.email?.trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "?";
}

/** Parse /dashboard routes: org pages use .../owner/learnings; repo pages use .../owner/repo[/tracking]. */
function parseDashboardPath(pathname: string): {
  owner?: string;
  repo?: string;
  isOrgPage: boolean;
  isTracking: boolean;
} {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "dashboard" || parts.length < 2) {
    return { isOrgPage: false, isTracking: false };
  }
  const owner = parts[1];
  if (!owner) {
    return { isOrgPage: false, isTracking: false };
  }
  if (parts.length === 2) {
    return { owner, isOrgPage: false, isTracking: false };
  }
  const seg2 = parts[2];
  if (!seg2) {
    return { owner, isOrgPage: false, isTracking: false };
  }
  if (seg2 === "learnings" || seg2 === "knowledge") {
    return { owner, isOrgPage: true, isTracking: false };
  }
  const repo = seg2;
  const isTracking = parts[3] === "tracking";
  return { owner, repo, isOrgPage: false, isTracking };
}

export function AppSidebar({ repos, user }: { repos: DashboardRepo[]; user: DashboardUser }) {
  const pathname = usePathname();
  const dashboardHome = pathname === "/dashboard";
  const ctx = parseDashboardPath(pathname);

  const sortedRepos = React.useMemo(
    () =>
      [...repos].sort((a, b) => `${a.owner}/${a.repo}`.localeCompare(`${b.owner}/${b.repo}`, "en")),
    [repos],
  );

  const showOrgLinks = Boolean(ctx.owner);
  const showTracking = Boolean(ctx.owner && ctx.repo && !ctx.isOrgPage);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border/80">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="ClawGuard">
              <Link href="/">
                <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ClawGuard</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Security audits
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={dashboardHome} tooltip="Dashboard">
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sortedRepos.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Repositories</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sortedRepos.map((r) => {
                  const href = `/dashboard/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <SidebarMenuItem key={`${r.owner}/${r.repo}`}>
                      <SidebarMenuButton asChild isActive={active} tooltip={`${r.owner}/${r.repo}`}>
                        <Link href={href}>
                          <Sparkles />
                          <span className="truncate font-mono text-xs">
                            {r.owner}/{r.repo}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {showOrgLinks && ctx.owner && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Organization</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.endsWith("/learnings")}
                      tooltip="Learnings"
                    >
                      <Link href={`/dashboard/${encodeURIComponent(ctx.owner)}/learnings`}>
                        <BookOpen />
                        <span>Learnings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.endsWith("/knowledge")}
                      tooltip="Knowledge"
                    >
                      <Link href={`/dashboard/${encodeURIComponent(ctx.owner)}/knowledge`}>
                        <Brain />
                        <span>Knowledge</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {showTracking && ctx.repo && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={ctx.isTracking}
                        tooltip="Post-merge tracking"
                      >
                        <Link
                          href={`/dashboard/${encodeURIComponent(ctx.owner)}/${encodeURIComponent(ctx.repo)}/tracking`}
                        >
                          <LineChart />
                          <span>Tracking</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user.image ?? undefined} alt="" />
                    <AvatarFallback className="rounded-lg text-xs">{initials(user)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name ?? "Account"}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {user.email ?? ""}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={user.image ?? undefined} alt="" />
                      <AvatarFallback className="rounded-lg text-xs">
                        {initials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name ?? "Account"}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/api/auth/signout?callbackUrl=/">
                    <LogOut className="size-4" />
                    Sign out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
