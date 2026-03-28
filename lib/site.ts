/** Install/settings page for the ClawGuard GitHub App (`NEXT_PUBLIC_GITHUB_APP_URL` overrides in the UI). */
export const GITHUB_APP_INSTALL_URL = "https://github.com/apps/clawguardbot" as const;

export const siteConfig = {
  name: "ClawGuard",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  description: "AI-powered security agent for GitHub pull requests",
  keywords: [
    "security",
    "code review",
    "GitHub",
    "pull request",
    "vulnerability scanner",
    "AI security",
    "OWASP",
  ],
  github: "https://github.com/Julian-AT/clawguard",
  author: {
    name: "Julian-AT",
    url: "https://github.com/Julian-AT",
  },
} as const;

export type SiteConfig = typeof siteConfig;
