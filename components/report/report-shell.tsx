import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { ClawGuardLogo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { PrintReportButton } from "@/components/report/print-report-button";
import { Button } from "@/components/ui/button";

interface ReportShellProps {
  owner: string;
  repo: string;
  prNumber: number;
  children: React.ReactNode;
}

export function ReportShell({
  owner,
  repo,
  prNumber,
  children,
}: ReportShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link
            href="/"
            className="flex items-center  text-sm font-semibold tracking-tight"
          >
            <ClawGuardLogo className="size-6" />
            ClawGuard
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {owner}/{repo}#{prNumber}
            </span>
            <Button variant="secondary" size="sm" asChild>
              <a
                href={`https://github.com/${owner}/${repo}/pull/${prNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5"
              >
                Open in GitHub
                <ExternalLink className="size-3.5 opacity-70" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>

            <PrintReportButton />
            <ModeToggle />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
