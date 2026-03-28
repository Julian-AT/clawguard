import type { SkillDefinition } from "@/lib/skills/types";

export const dependencyAudit: SkillDefinition = {
  id: "dependency-audit",
  name: "Dependency & Supply-Chain Audit",
  domain: "dependency",
  applicableTo: ["dependency-audit"],
  priority: 1,
  content: `Prioritize exploitable dependency risk over raw version age.

Sources: Correlate \`npm audit\`, \`pnpm audit\`, OSV-Scanner, or GitHub Dependabot-style feeds with the repo lockfile (\`package-lock.json\`, \`pnpm-lock.yaml\`, \`yarn.lock\`). Match exact resolved versions to CVE records.

For each vulnerable package report: CVE or GHSA ID, package name and affected version range, installed version, CVSS or ecosystem severity, short description, whether a fixed version exists and the semver to upgrade to, and notes on exploitability (network, user interaction, privileges required).

Typosquatting: Compare declared package names to known official names (transitive renames, homoglyphs, scoped vs unscoped confusion). Flag install scripts (\`postinstall\`) from low-reputation packages.

Transitive risk: Call out when a direct dependency pins a vulnerable transitive child and the fix requires upstream bump.

License risk: Note copyleft (e.g. GPL) in otherwise permissive projects if distribution mode could trigger obligations; separate from CVE severity but include in compliance summary.

Do not dismiss devDependencies if they run in CI or build pipelines (supply-chain). When audit output is unavailable, state the gap and recommend running OSV/npm audit in CI.

Output format per item: \`CVE-XXXX\` | package@version | Severity | Exploitability summary | Fix: version or workaround | Notes.`,
};
