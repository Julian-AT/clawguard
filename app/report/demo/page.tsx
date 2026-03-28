import { ReportView } from "@/components/report/report-view";
import { parseAuditResult } from "@/lib/analysis/types";
import { getDemoAuditData } from "@/lib/demo-audit";

/** Single canonical interactive report demo (same payload as Redis `demo/clawguard-showcase/pr/1`). */
export default function DemoReportPage() {
  const data = getDemoAuditData();
  if (!data.result) {
    return null;
  }
  const result = parseAuditResult(data.result);
  return (
    <ReportView
      result={result}
      owner={data.pr.owner}
      repo={data.pr.repo}
      prNumber={data.pr.number}
      prTitle={data.pr.title}
      timestamp={data.timestamp}
    />
  );
}
