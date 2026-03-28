"use client";

import {
  BookOpen,
  Brain,
  CircleHelpIcon,
  ExternalLinkIcon,
  LayoutDashboardIcon,
  LineChart,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import type {
  DashboardRepo,
  DashboardUser,
} from "@/components/dashboard/dashboard-shell";
import { GithubMarkIcon } from "@/components/github-mark-icon";
import { ClawGuardLogo } from "@/components/logo";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
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

export function AppSidebar({
  repos,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  repos: DashboardRepo[];
  user: DashboardUser;
}) {
  const pathname = usePathname();
  const dashboardHome = pathname === "/dashboard";
  const ctx = parseDashboardPath(pathname);
  const githubAppUrl =
    process.env.NEXT_PUBLIC_GITHUB_APP_URL ?? "https://github.com/apps";

  const sortedRepos = React.useMemo(
    () =>
      [...repos].sort((a, b) =>
        `${a.owner}/${a.repo}`.localeCompare(`${b.owner}/${b.repo}`, "en"),
      ),
    [repos],
  );

  const showOrgLinks = Boolean(ctx.owner);
  const showTracking = Boolean(ctx.owner && ctx.repo && !ctx.isOrgPage);

  const dashboardItem = React.useMemo(
    () => ({
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon className="size-4" />,
      isActive: dashboardHome,
    }),
    [dashboardHome],
  );

  const repoNavItems = React.useMemo(
    () =>
      sortedRepos.map((r) => {
        const href = `/dashboard/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return {
          title: `${r.owner}/${r.repo}`,
          url: href,
          icon: <GithubMarkIcon className="size-4" />,
          isActive: active,
        };
      }),
    [pathname, sortedRepos],
  );

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/80">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="ClawGuard">
              <Link href="/">
                <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <ClawGuardLogo className="size-4" />
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
        <NavMain showQuickActions={false} items={[dashboardItem]} />

        {repoNavItems.length > 0 ? (
          <>
            <SidebarSeparator />
            <NavMain showQuickActions={false} items={repoNavItems} />
          </>
        ) : null}

        {showOrgLinks && ctx.owner ? (
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
                      <Link
                        href={`/dashboard/${encodeURIComponent(ctx.owner)}/learnings`}
                      >
                        <BookOpen className="size-4" />
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
                      <Link
                        href={`/dashboard/${encodeURIComponent(ctx.owner)}/knowledge`}
                      >
                        <Brain className="size-4" />
                        <span>Knowledge</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {showTracking && ctx.repo ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={ctx.isTracking}
                        tooltip="Post-merge tracking"
                      >
                        <Link
                          href={`/dashboard/${encodeURIComponent(ctx.owner)}/${encodeURIComponent(ctx.repo)}/tracking`}
                        >
                          <LineChart className="size-4" />
                          <span>Tracking</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : null}

        <NavSecondary
          className="mt-auto"
          items={[
            {
              title: "GitHub App",
              url: githubAppUrl,
              icon: <ExternalLinkIcon className="size-4" />,
              external: true,
            },
            {
              title: "Help",
              url: "/",
              icon: <CircleHelpIcon className="size-4" />,
            },
          ]}
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80">
        <NavUser
          user={{
            name: user.name ?? "Account",
            email: user.email ?? "",
            avatar: user.image ?? "",
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
