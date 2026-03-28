import type { SkillDefinition } from "@/lib/skills/types";

export const infrastructureReview: SkillDefinition = {
  id: "infrastructure-review",
  name: "Infrastructure & CI/CD Security",
  domain: "infrastructure",
  applicableTo: ["infrastructure-review"],
  priority: 1,
  content: `Dockerfiles: Prefer non-root \`USER\`; pin base images by digest or immutable minor tags; use multi-stage builds to keep runtime images minimal; never \`COPY\` secrets or use build-args for long-lived credentials. Avoid \`curl | sh\` in images without checksum verification. Scan for exposed ports that should bind localhost-only.

Kubernetes: Set \`securityContext\` (runAsNonRoot, readOnlyRootFilesystem where possible, drop ALL capabilities, no \`privileged\`). Define CPU/memory requests and limits. Avoid hostPath for sensitive mounts. NetworkPolicies should default-deny where appropriate. No plaintext secrets in manifests—use sealed secrets or external secret stores.

Terraform / cloud IaC: No hardcoded passwords or API keys in \`.tf\` or modules; use variables from CI secret stores. Enable encryption at rest for databases and buckets; block public ACLs on data stores unless required. Security groups/firewall rules: least privilege, no \`0.0.0.0/0\` on admin ports.

CI/CD (GitHub Actions, GitLab CI, etc.): No long-lived \`GITHUB_TOKEN\` or cloud keys in repo variables when OIDC federation exists—prefer OIDC. Pin third-party actions to full commit SHAs. Restrict \`workflow_dispatch\` and fork PR workflows from accessing secrets. Review \`pull_request_target\` usage carefully.

Frontend bundles: Ensure server-only env vars are not referenced from client code; Next.js \`NEXT_PUBLIC_*\` is exposed—never put secrets there.`,
};
