"use client";

import {
  BookOpen,
  Brain,
  CircleHelpIcon,
  ExternalLinkIcon,
  LayoutDashboardIcon,
  LineChart,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import type { DashboardRepo, DashboardUser } from "@/components/dashboard/dashboard-shell";
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
import { DEMO_DASHBOARD_HUB_PATH, isPublicDemoDashboardPath } from "@/lib/public-demo-dashboard";
import { GITHUB_APP_INSTALL_URL } from "@/lib/site";

const LAST_REPO_STORAGE_KEY = "clawguard.dashboard.repo";

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

function parseRepoDashboardUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(/^\/dashboard\/([^/]+)\/([^/]+)$/);
  if (!m) return null;
  return { owner: decodeURIComponent(m[1]), repo: decodeURIComponent(m[2]) };
}

function repoListIncludes(repos: DashboardRepo[], owner: string, repo: string): boolean {
  return repos.some((r) => r.owner === owner && r.repo === repo);
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
  const isDemoPage = isPublicDemoDashboardPath(pathname);
  const ctx = parseDashboardPath(pathname);
  const githubAppUrl = process.env.NEXT_PUBLIC_GITHUB_APP_URL ?? GITHUB_APP_INSTALL_URL;

  const sortedRepos = React.useMemo(
    () =>
      [...repos].sort((a, b) => `${a.owner}/${a.repo}`.localeCompare(`${b.owner}/${b.repo}`, "en")),
    [repos],
  );

  const [persistedRepo, setPersistedRepo] = React.useState<{
    owner: string;
    repo: string;
  } | null>(null);

  React.useEffect(() => {
    if (sortedRepos.length === 0) return;
    try {
      const raw = sessionStorage.getItem(LAST_REPO_STORAGE_KEY);
      if (!raw) {
        setPersistedRepo(null);
        return;
      }
      const parsed = JSON.parse(raw) as { owner?: string; repo?: string };
      if (
        typeof parsed.owner === "string" &&
        typeof parsed.repo === "string" &&
        repoListIncludes(sortedRepos, parsed.owner, parsed.repo)
      ) {
        setPersistedRepo({ owner: parsed.owner, repo: parsed.repo });
      } else {
        setPersistedRepo(null);
      }
    } catch {
      setPersistedRepo(null);
    }
  }, [sortedRepos]);

  React.useEffect(() => {
    if (!(ctx.owner && ctx.repo && !ctx.isOrgPage)) return;
    const next = { owner: ctx.owner, repo: ctx.repo };
    if (!repoListIncludes(sortedRepos, next.owner, next.repo)) return;
    setPersistedRepo(next);
    try {
      sessionStorage.setItem(LAST_REPO_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / private mode
    }
  }, [ctx.owner, ctx.repo, ctx.isOrgPage, sortedRepos]);

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

  const trackingTarget = React.useMemo(() => {
    if (ctx.owner && ctx.repo && !ctx.isOrgPage) {
      return { owner: ctx.owner, repo: ctx.repo };
    }
    const active = repoNavItems.find((r) => r.isActive);
    if (active) {
      const parsed = parseRepoDashboardUrl(active.url);
      if (parsed && repoListIncludes(sortedRepos, parsed.owner, parsed.repo)) {
        return parsed;
      }
    }
    if (persistedRepo && repoListIncludes(sortedRepos, persistedRepo.owner, persistedRepo.repo)) {
      return persistedRepo;
    }
    return null;
  }, [ctx, repoNavItems, persistedRepo, sortedRepos]);

  const orgOwner = ctx.owner ?? persistedRepo?.owner;
  const showOrgLinks = Boolean(orgOwner);
  const showTracking = Boolean(trackingTarget);

  const dashboardItem = React.useMemo(
    () => ({
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon className="size-4" />,
      isActive: dashboardHome,
    }),
    [dashboardHome],
  );

  const demoItem = React.useMemo(
    () => ({
      title: "Demo",
      url: DEMO_DASHBOARD_HUB_PATH,
      icon: <PlayCircle className="size-4" />,
      isActive: isDemoPage,
    }),
    [isDemoPage],
  );

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/80">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="ClawGuard">
              <Link href="/dashboard">
                <div className="flex size-8 items-center justify-center rounded-md text-sidebar-primary-foreground">
                  <ClawGuardLogo className="size-8" />
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

        {isDemoPage ? (
          <>
            <SidebarSeparator />
            <NavMain showQuickActions={false} items={[demoItem]} />
          </>
        ) : null}

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
                      <Link href={`/dashboard/${encodeURIComponent(ctx.owner)}/learnings`}>
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
                      <Link href={`/dashboard/${encodeURIComponent(ctx.owner)}/knowledge`}>
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
