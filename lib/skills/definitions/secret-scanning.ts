import type { SkillDefinition } from "@/lib/skills/types";

export const secretScanning: SkillDefinition = {
  id: "secret-scanning",
  name: "Secret Scanning & Entropy Heuristics",
  domain: "secrets",
  applicableTo: ["secret-scanner"],
  priority: 1,
  content: `Detect high-entropy strings and provider-shaped tokens in added/changed lines. Use regex anchors where possible; reduce false positives.

Cover 20+ providers/services with shaped secrets: AWS (AKIA access keys, session tokens); GCP (AIza, service account JSON private_key, OAuth client secrets); Azure (storage account keys, SAS, DefaultEndpointsProtocol=, client secrets); Stripe (\`sk_live_\`, \`sk_test_\`, \`rk_live_\`); GitHub (\`ghp_\`, \`gho_\`, \`github_pat_\`); GitLab (\`glpat-\`); Google Gemini/Maps (\`AIza\`); Slack (\`xox[baprs]-\`); Discord bot tokens; Telegram bot API keys; DigitalOcean (\`dop_v1_\`); Twilio (Account SID + auth token patterns); SendGrid (\`SG.\`); Mailgun API keys; Cloudflare API tokens; Datadog API/app keys; Sentry DSN with embedded secret; PagerDuty integration keys; Heroku API keys; npm publish tokens; OpenAI (\`sk-proj-\`, \`sk-\`); Anthropic; MongoDB Atlas connection strings with password; Snowflake PAT/JWT; Square (\`sq0atp-\`, \`sq0csp-\`); PayPal client secrets; private keys \`-----BEGIN.*PRIVATE KEY-----\`; generic JWT-like three-part base64 only if context suggests secret.

Entropy: On added lines, if a string is long (>20 chars) and Shannon entropy > 4.5, flag as candidate secret with MEDIUM confidence unless pattern matches a provider (then HIGH).

Exclusions: Skip paths and names matching test fixtures, \`.example\`, \`mock\`, \`dummy\`, \`fake_\`, snapshot files, and documented sample keys from vendor docs. Check \`.gitignore\` covers \`.env\`, \`.env.*\`, \`*.pem\`, \`*.key\`, \`id_rsa\`, \`.p12\`, \`.pfx\`; warn if secrets live in tracked files that should be ignored.

Report fields: provider (or "unknown high-entropy"), file path, line number, redacted preview (first/last 4), confidence (HIGH/MEDIUM/LOW), remediation (rotate credential, remove from history, use secret manager). Never echo full live secrets in outputs.`,
};
