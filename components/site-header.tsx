"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

function buildCrumbs(pathname: string): { label: string; href?: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "dashboard") {
    return [{ label: "Dashboard", href: "/dashboard" }];
  }
  const crumbs: { label: string; href?: string }[] = [{ label: "Dashboard", href: "/dashboard" }];
  if (parts.length === 1) return crumbs;

  const ownerSeg = parts[1];
  if (!ownerSeg) return crumbs;
  const owner = decodeURIComponent(ownerSeg);

  if (parts[2] === "learnings") {
    crumbs.push({ label: owner });
    crumbs.push({ label: "Learnings" });
    return crumbs;
  }
  if (parts[2] === "knowledge") {
    crumbs.push({ label: owner });
    crumbs.push({ label: "Knowledge" });
    return crumbs;
  }

  const repo = parts[2] ? decodeURIComponent(parts[2]) : undefined;
  if (!repo) {
    crumbs.push({ label: owner });
    return crumbs;
  }

  crumbs.push({ label: owner });

  if (parts[3] === "tracking") {
    const o = parts[1];
    const r = parts[2];
    if (o && r) {
      crumbs.push({
        label: repo,
        href: `/dashboard/${encodeURIComponent(o)}/${encodeURIComponent(r)}`,
      });
    } else {
      crumbs.push({ label: repo });
    }
    crumbs.push({ label: "Tracking" });
    return crumbs;
  }

  crumbs.push({ label: repo });
  return crumbs;
}

export function SiteHeader() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  const githubAppUrl = process.env.NEXT_PUBLIC_GITHUB_APP_URL ?? "https://github.com/apps";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="sm:flex-wrap">
          <BreadcrumbItem className="min-w-0 sm:hidden">
            <BreadcrumbPage className="max-w-[12rem] truncate font-mono text-xs">
              {crumbs[crumbs.length - 1]?.label}
            </BreadcrumbPage>
          </BreadcrumbItem>
          {crumbs.map((c, crumbIndex) => {
            const last = crumbIndex === crumbs.length - 1;
            return (
              <React.Fragment key={`${pathname}-${c.label}-${c.href ?? "current"}`}>
                {crumbIndex > 0 ? <BreadcrumbSeparator className="hidden sm:inline-flex" /> : null}
                <BreadcrumbItem className="hidden min-w-0 sm:inline-flex">
                  {last ? (
                    <BreadcrumbPage className="font-mono text-xs sm:text-sm">
                      {c.label}
                    </BreadcrumbPage>
                  ) : c.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={c.href}>{c.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground sm:text-sm">
                      {c.label}
                    </span>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" className="hidden gap-1.5 sm:inline-flex" asChild>
          <a href={githubAppUrl} target="_blank" rel="noreferrer">
            GitHub App
            <ExternalLink className="size-3.5 opacity-70" />
          </a>
        </Button>
        <ModeToggle />
      </div>
    </header>
  );
}
