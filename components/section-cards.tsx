import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

export function SectionCards({
  repoCount,
  totalAudits,
  avgScore,
  criticalFindings,
}: {
  repoCount: number;
  totalAudits: number;
  avgScore: number | null;
  criticalFindings: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card min-w-0" size="sm">
        <CardHeader>
          <CardDescription>Repositories</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {repoCount}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              Tracked
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Repos with stored audits <TrendingUpIcon className="size-4 shrink-0" />
          </div>
          <div className="text-muted-foreground">From ClawGuard PR runs</div>
        </CardFooter>
      </Card>
      <Card className="@container/card min-w-0" size="sm">
        <CardHeader>
          <CardDescription>Completed audits</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {totalAudits}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              Finished
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Successful audit runs <TrendingUpIcon className="size-4 shrink-0" />
          </div>
          <div className="text-muted-foreground">Across all repositories</div>
        </CardFooter>
      </Card>
      <Card className="@container/card min-w-0" size="sm">
        <CardHeader>
          <CardDescription>Avg. latest score</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {avgScore ?? "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {avgScore != null ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {avgScore != null ? "Indexed" : "N/A"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Mean of latest score per repo <TrendingUpIcon className="size-4 shrink-0" />
          </div>
          <div className="text-muted-foreground">Higher is better</div>
        </CardFooter>
      </Card>
      <Card className="@container/card min-w-0" size="sm">
        <CardHeader>
          <CardDescription>Critical findings</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {criticalFindings}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingDownIcon />
              CRITICAL
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total across completed audits <TrendingDownIcon className="size-4 shrink-0" />
          </div>
          <div className="text-muted-foreground">Severity CRITICAL only</div>
        </CardFooter>
      </Card>
    </div>
  );
}
