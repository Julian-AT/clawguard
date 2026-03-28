import { notFound } from "next/navigation";
import { getAuditResult } from "@/lib/redis";
import { AuditResultSchema } from "@/lib/analysis/types";
import { ReportView } from "@/components/report/report-view";
import { ProcessingView } from "@/components/report/processing-view";
import { ErrorView } from "@/components/report/error-view";

interface ReportPageProps {
  params: Promise<{ owner: string; repo: string; pr: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { owner, repo, pr } = await params;
  const key = `${owner}/${repo}/pr/${pr}`;
  const auditData = await getAuditResult(key);

  if (!auditData) {
    notFound();
  }

  if (auditData.status === "processing") {
    return <ProcessingView owner={owner} repo={repo} pr={pr} />;
  }

  if (auditData.status === "error") {
    return (
      <ErrorView
        owner={owner}
        repo={repo}
        pr={pr}
        message={auditData.errorMessage}
      />
    );
  }

  if (!auditData.result) {
    notFound();
  }

  const result = AuditResultSchema.parse(auditData.result);

  return (
    <ReportView
      result={result}
      owner={owner}
      repo={repo}
      prNumber={parseInt(pr)}
      prTitle={auditData.pr.title}
      timestamp={auditData.timestamp}
    />
  );
}
