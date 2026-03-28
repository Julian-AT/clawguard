"use client";

import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorViewProps {
  owner: string;
  repo: string;
  pr: string;
  message?: string;
}

export function ErrorView({ owner, repo, pr, message }: ErrorViewProps) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-8 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <ShieldAlert className="size-16 text-destructive" aria-hidden />
          </div>
          <CardTitle className="text-xl">Audit failed</CardTitle>
          <CardDescription>
            The security audit for{" "}
            <span className="font-mono text-foreground">
              {owner}/{repo}
            </span>{" "}
            PR #{pr} encountered an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {message && (
            <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-left text-xs">
              {message}
            </pre>
          )}
          <p className="text-sm text-muted-foreground">
            Re-run by @mentioning ClawGuard on the pull request.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
