import { ReportView } from "@/components/report/report-view";
import { mockAuditResult } from "@/lib/analysis/mock-data";

export default function DemoReportPage() {
  return (
    <ReportView
      result={mockAuditResult}
      owner="techcorp"
      repo="api"
      prNumber={1}
      prTitle="Demo: Add user authentication"
      timestamp={new Date().toISOString()}
    />
  );
}
