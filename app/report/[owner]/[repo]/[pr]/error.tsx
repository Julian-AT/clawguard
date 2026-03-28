"use client";

import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-8 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <ShieldAlert className="size-16 text-destructive" aria-hidden />
          </div>
          <CardTitle className="text-xl">Audit error</CardTitle>
          <CardDescription>
            This audit encountered an error. Please re-run by @mentioning ClawGuard on the pull
            request.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
