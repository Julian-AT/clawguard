"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Shield } from "lucide-react";

interface ProcessingViewProps {
  owner: string;
  repo: string;
  pr: string;
}

export function ProcessingView({ owner, repo, pr }: ProcessingViewProps) {
  const router = useRouter();
  const [dots, setDots] = useState("");

  useEffect(() => {
    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    // Poll for completion every 4 seconds
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/report/${owner}/${repo}/${pr}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "complete" || data.status === "error") {
            router.refresh();
          }
        }
      } catch {
        // Silently retry on next interval
      }
    }, 4000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(pollInterval);
    };
  }, [owner, repo, pr, router]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <Shield className="h-16 w-16 text-primary animate-pulse" />
          </div>
          <h1 className="text-xl font-semibold">
            Analysis in progress{dots}
          </h1>
          <p className="text-sm text-muted-foreground">
            ClawGuard is scanning{" "}
            <span className="font-mono text-foreground">
              {owner}/{repo}
            </span>{" "}
            PR #{pr}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            This page refreshes automatically when the audit completes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
