import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportNotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-8 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <ShieldAlert className="size-16 text-muted-foreground" aria-hidden />
          </div>
          <CardTitle className="text-xl">Report not found</CardTitle>
          <CardDescription>
            This PR hasn&apos;t been audited yet. Mention{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">@clawguard</code> on
            a pull request to trigger a security audit.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
