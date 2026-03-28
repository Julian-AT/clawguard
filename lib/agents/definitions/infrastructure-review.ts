import { gateway } from "@ai-sdk/gateway";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { createBashTool } from "bash-tool";
import { z } from "zod";
import { registerAgent } from "@/lib/agents/registry";
import type { AgentContext, AgentResult, SecurityAgentDefinition } from "@/lib/agents/types";
import { type Finding, FindingSchema, type ReconResult } from "@/lib/analysis/types";
import { injectSkills } from "@/lib/skills";

const OutputSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string(),
});

const AGENT_NAME = "infrastructure-review" as const;
const REQUIRED_SKILLS = ["infrastructure-review"] as const;

const INFRA_PATH_RE =
  /(\/Dockerfile[^/]*$)|(\.dockerignore$)|(\/docker-compose[^/]*\.ya?ml$)|(\.github\/workflows\/)|(\/\.gitlab-ci\.ya?ml$)|(\/Jenkinsfile$)|(\/kubernetes\/)|(\/k8s\/)|(\/charts\/)|(\.ya?ml$)|(\.tf$)|(\.tfvars$)|(\/terraform\/)|(\/helm\/)|(\/deploy\/)/i;

function infraExcerpts(recon: ReconResult): string {
  if (!recon.fileExcerpts) return "(No excerpts; use tools to read infra files.)";
  const entries = Object.entries(recon.fileExcerpts).filter(([path]) => INFRA_PATH_RE.test(path));
  if (entries.length === 0)
    return "(No infra-tagged excerpts; use tools to locate Docker, k8s, Terraform, CI configs.)";
  return entries.map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``).join("\n\n");
}

function buildPrompt(context: AgentContext): string {
  const paths = context.recon.changedFiles.map((f) => f.path).filter((p) => INFRA_PATH_RE.test(p));
  return [
    "## Task",
    "Review infrastructure-as-code and CI/CD for security misconfigurations only.",
    "Cover: Dockerfiles (root user, secrets in layers, COPY . ., exposed ports), docker-compose, Kubernetes/Helm manifests (privileged, hostPath, insecure capabilities, image tags :latest, missing resource limits, public Services), Terraform (open security groups, public S3, weak IAM), GitHub Actions/GitLab CI (untrusted checkout, secrets in logs, excessive permissions).",
    "Use tools to read full files when excerpts are incomplete.",
    "",
    "## Likely changed infra paths",
    paths.length
      ? paths.join(", ")
      : "(none matched heuristics — search repo with tools if needed)",
    "",
    "## Excerpts",
    infraExcerpts(context.recon),
    "",
    "## Diff (context)",
    "<diff>",
    context.recon.diff.slice(0, 120_000),
    "</diff>",
  ].join("\n");
}

const infrastructureReviewAgent: SecurityAgentDefinition = {
  name: AGENT_NAME,
  description:
    "Reviews Docker, Kubernetes, Terraform, and CI configs for deployment and pipeline security issues.",
  requiredSkills: [...REQUIRED_SKILLS],
  requiredTools: ["fs:read", "shell:exec"],
  maxSteps: 15,
  dependsOn: [],
  async execute(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const modelRef = `${context.config.model.provider}/${context.config.model.model}`;

    const baseInstructions = [
      "You are a cloud and platform security engineer. Stay within infra and pipelines — not application business logic.",
      "For each issue: cite file and line; map to CWE where possible (e.g. CWE-250 for excessive privileges); OWASP often ASVS deployment or supply-chain adjacent controls.",
      "attackScenario should describe cluster/cloud impact (lateral movement, data exfil, pipeline takeover).",
      "If no infra files apply to this PR, return empty findings and state that clearly.",
    ].join("\n");

    const instructions = injectSkills(baseInstructions, AGENT_NAME, [...REQUIRED_SKILLS]);
    const { tools } = await createBashTool({ sandbox: context.sandbox });
    const prompt = buildPrompt(context);

    try {
      const loop = new ToolLoopAgent({
        model: gateway(modelRef),
        tools,
        output: Output.object({ schema: OutputSchema }),
        stopWhen: stepCountIs(15),
        instructions,
      });

      const result = await loop.generate({
        prompt,
        abortSignal: context.abortSignal,
      });

      return {
        agentName: AGENT_NAME,
        findings: result.output.findings as Finding[],
        summary: result.output.summary,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        agentName: AGENT_NAME,
        findings: [],
        summary: `Agent failed: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

registerAgent(infrastructureReviewAgent);
