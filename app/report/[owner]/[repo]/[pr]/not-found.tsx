import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <ShieldAlert className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Report not found</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            This PR hasn&apos;t been audited yet. Mention{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">@clawguard</code> on
            a pull request to trigger a security audit.
          </p>
          <Link
            href="/"
            className="inline-block text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
