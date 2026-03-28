import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ReviewVerdictResult } from "@/lib/analysis/types";

interface VerdictBannerProps {
  verdict: ReviewVerdictResult;
}

export function VerdictBanner({ verdict }: VerdictBannerProps) {
  const variant =
    verdict.verdict === "approve"
      ? "border-emerald-500/50 bg-emerald-500/10"
      : verdict.verdict === "request-changes"
        ? "border-red-500/50 bg-red-500/10"
        : "border-amber-500/50 bg-amber-500/10";

  const title =
    verdict.verdict === "approve"
      ? "Approve"
      : verdict.verdict === "request-changes"
        ? "Request changes"
        : "Comment";

  return (
    <Alert className={`${variant} text-foreground`}>
      <AlertTitle>Review verdict: {title}</AlertTitle>
      <AlertDescription className="text-foreground/90 text-sm leading-relaxed">
        {verdict.reasoning}
      </AlertDescription>
    </Alert>
  );
}
