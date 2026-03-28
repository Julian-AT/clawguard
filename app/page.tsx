import Link from "next/link";
import { Shield, Sparkles, Wrench, LayoutDashboard } from "lucide-react";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-semibold">
          <Shield className="size-6 text-primary" />
          ClawGuard
        </div>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Dashboard
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        <section className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            AI security for every pull request
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            @mention ClawGuard on a PR for a deep security audit, interactive
            report, and optional auto-fixes committed to your branch — one Next.js
            deployment.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/report/demo"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              View demo report
            </Link>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}
            >
              Open dashboard
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Sparkles className="size-8 text-primary mb-2" />
              <CardTitle className="text-lg">Agentic analysis</CardTitle>
              <CardDescription>
                Recon, vulnerability scan, and threat synthesis with structured
                findings, CWE/OWASP mapping, and Mermaid data-flow diagrams.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Wrench className="size-8 text-primary mb-2" />
              <CardTitle className="text-lg">Auto-fix loop</CardTitle>
              <CardDescription>
                Apply validated fixes from the PR thread; re-audit runs
                automatically when fixes land.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <LayoutDashboard className="size-8 text-primary mb-2" />
              <CardTitle className="text-lg">Dashboard</CardTitle>
              <CardDescription>
                GitHub sign-in, repo overview, and score trends over PR audits
                stored in Redis.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
    </div>
  );
}
