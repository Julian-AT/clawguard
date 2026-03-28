import { LayoutDashboard, Shield, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Shield className="size-6 text-primary" aria-hidden />
            ClawGuard
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/report/demo">Demo report</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <ModeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-16 md:px-6">
        <section className="space-y-6 text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            AI security for every pull request
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-muted-foreground md:text-lg">
            @mention ClawGuard on a PR for a deep security audit, interactive report, and optional
            auto-fixes committed to your branch — one Next.js deployment.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/report/demo">View demo report</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-6 md:grid-cols-3">
          <Card className="border-border/80">
            <CardHeader>
              <Sparkles className="mb-2 size-8 text-primary" aria-hidden />
              <CardTitle className="text-lg">Agentic analysis</CardTitle>
              <CardDescription>
                Recon, vulnerability scan, and threat synthesis with structured findings, CWE/OWASP
                mapping, and Mermaid data-flow diagrams.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/80">
            <CardHeader>
              <Wrench className="mb-2 size-8 text-primary" aria-hidden />
              <CardTitle className="text-lg">Auto-fix loop</CardTitle>
              <CardDescription>
                Apply validated fixes from the PR thread; re-audit runs automatically when fixes
                land.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-border/80">
            <CardHeader>
              <LayoutDashboard className="mb-2 size-8 text-primary" aria-hidden />
              <CardTitle className="text-lg">Dashboard</CardTitle>
              <CardDescription>
                GitHub sign-in, repo overview, and score trends over PR audits stored in Redis.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border/80 py-8 text-center text-sm text-muted-foreground">
        <p>ClawGuard — security reviews for GitHub pull requests</p>
      </footer>
    </div>
  );
}
