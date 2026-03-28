import { NextResponse } from "next/server";
import { getAuditResult } from "@/lib/redis";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; pr: string }> }
) {
  const { owner, repo, pr } = await params;
  const key = `${owner}/${repo}/pr/${pr}`;
  const data = await getAuditResult(key);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
