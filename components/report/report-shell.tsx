import Link from "next/link";
import { Shield } from "lucide-react";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { PrintReportButton } from "@/components/report/print-report-button";

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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <Shield className="size-5 text-primary" />
            ClawGuard
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground font-mono text-xs">
              {owner}/{repo}#{prNumber}
            </span>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Dashboard
            </Link>
            <a
              href={`https://github.com/${owner}/${repo}/pull/${prNumber}`}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" })
              )}
            >
              Open in GitHub
            </a>
            <PrintReportButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
