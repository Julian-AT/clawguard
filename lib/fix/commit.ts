import type { Octokit } from "@octokit/rest";
import type { Finding } from "@/lib/analysis/types";

/** Commits via Contents API; always fetches current blob SHA before update. */
export async function commitFixToGitHub(
  octokit: Octokit,
  params: {
    owner: string;
    repo: string;
    branch: string;
    filePath: string;
    content: string;
    finding: Finding;
  }
): Promise<string> {
  const { data: currentFile } = await octokit.repos.getContent({
    owner: params.owner,
    repo: params.repo,
    path: params.filePath,
    ref: params.branch,
  });

  if (Array.isArray(currentFile)) {
    throw new Error("Path is a directory, not a file");
  }

  const { data: commitResult } = await octokit.repos.createOrUpdateFileContents(
    {
      owner: params.owner,
      repo: params.repo,
      path: params.filePath,
      message: `fix(security): ${params.finding.type} (${params.finding.cweId})\n\nAuto-fix applied by ClawGuard for ${params.finding.severity} finding.\nLocation: ${params.filePath}:${params.finding.line}`,
      content: Buffer.from(params.content).toString("base64"),
      sha: currentFile.sha,
      branch: params.branch,
      committer: {
        name: "ClawGuard Bot",
        email: "clawguard[bot]@users.noreply.github.com",
      },
    }
  );

  return commitResult.commit.sha ?? "";
}

export async function commitBatchFixesToGitHub(
  octokit: Octokit,
  params: {
    owner: string;
    repo: string;
    branch: string;
    files: Map<string, string>;
    findings: Finding[];
  }
): Promise<string> {
  const { owner, repo, branch, files, findings } = params;
  if (files.size === 0) {
    return "";
  }

  const ref = `heads/${branch}`;
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref,
  });
  const parentSha = refData.object.sha;

  const { data: parentCommit } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: parentSha,
  });
  const baseTreeSha = parentCommit.tree.sha;

  const tree = [...files.entries()].map(([path, content]) => ({
    path,
    mode: "100644" as const,
    type: "blob" as const,
    content,
  }));

  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    tree,
    base_tree: baseTreeSha,
  });

  const message = [
    `fix(security): ClawGuard batch auto-fix (${findings.length} finding(s))`,
    "",
    ...findings.map(
      (f) =>
        `- ${f.type} (${f.cweId}) ${f.severity} @ ${f.file}:${f.line}`
    ),
  ].join("\n");

  const { data: created } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.sha,
    parents: [parentSha],
    committer: {
      name: "ClawGuard Bot",
      email: "clawguard[bot]@users.noreply.github.com",
      date: new Date().toISOString(),
    },
  });

  await octokit.git.updateRef({
    owner,
    repo,
    ref,
    sha: created.sha,
  });

  return created.sha;
}
