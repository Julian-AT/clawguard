"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

interface ErrorViewProps {
  owner: string;
  repo: string;
  pr: string;
  message?: string;
}

export function ErrorView({ owner, repo, pr, message }: ErrorViewProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-xl">Audit Failed</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            The security audit for{" "}
            <span className="font-mono text-foreground">
              {owner}/{repo}
            </span>{" "}
            PR #{pr} encountered an error.
          </p>
          {message && (
            <pre className="text-left text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
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
