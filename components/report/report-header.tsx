import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

interface ReportHeaderProps {
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  timestamp: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return "just now";
}

export function ReportHeader({
  owner,
  repo,
  prNumber,
  prTitle,
  timestamp,
}: ReportHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-7 text-primary" />
          <span className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            ClawGuard Security Report
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {owner}/{repo}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="font-mono text-xs">
            PR #{prNumber}
          </Badge>
          <span className="truncate max-w-md">{prTitle}</span>
        </div>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <div>Audited</div>
        <div className="font-medium">{formatRelativeTime(timestamp)}</div>
        <div className="text-[10px] mt-0.5">
          {new Date(timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
