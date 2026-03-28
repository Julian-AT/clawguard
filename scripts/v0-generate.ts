/**
 * Dev-time script to generate/refine report components using v0 SDK.
 * Run manually: npx tsx scripts/v0-generate.ts
 *
 * Requires V0_API_KEY environment variable and a paid v0 plan.
 * This is OPTIONAL — all components can be built manually without v0.
 *
 * Usage:
 *   V0_API_KEY=xxx npx tsx scripts/v0-generate.ts --component score-gauge
 *   V0_API_KEY=xxx npx tsx scripts/v0-generate.ts --component finding-card
 */

import { createClient } from "v0-sdk";

const V0_API_KEY = process.env.V0_API_KEY;
if (!V0_API_KEY) {
  console.error("V0_API_KEY not set. Skipping v0 generation.");
  console.error("All components are built manually — v0 is optional.");
  process.exit(0);
}

const prompts: Record<string, string> = {
  "score-gauge":
    "Create a semicircle security score gauge component using Recharts RadialBarChart. Score 0-100 with A-F grade. Color coded: red (0-59), amber (60-79), green (80-100). Dark theme, zinc background.",
  "finding-card":
    "Create an expandable security finding card with severity badge, vulnerability type, file:line location, CWE/OWASP tags. Expands to show description, attack scenario callout, and code diff placeholder. Dark theme, shadcn/ui accordion.",
  "compliance-table":
    "Create a compliance mapping table with columns: Finding (with severity badge), CWE, PCI DSS, SOC 2, HIPAA, NIST, OWASP ASVS. Dark theme, dense enterprise styling.",
  "attack-surface":
    "Create an attack surface table with columns: Name, Type, Exposure, Risk Level (with colored badge), Description. Sorted by risk level. Dark theme, enterprise density.",
};

async function generateComponent(componentName: string, prompt: string) {
  const client = createClient({ apiKey: V0_API_KEY! });

  // Init chat with template files for project context
  const chat = await client.chats.init({
    type: "files",
    files: [
      {
        name: "globals.css",
        content: `@import "tailwindcss";

@theme {
  --color-background: #09090b;
  --color-foreground: #fafafa;
  --color-card: #18181b;
  --color-border: #27272a;
  --color-muted-foreground: #a1a1aa;
}`,
      },
      {
        name: "theme.ts",
        content: `// ClawGuard dark theme variables for v0 component generation
export const severityColors = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-blue-500 text-white",
  INFO: "bg-gray-500 text-white",
};`,
      },
    ],
  });

  // Send component generation prompt to the initialized chat
  const result = await client.chats.sendMessage({
    chatId: chat.id,
    message: prompt,
  });

  console.log(`\n--- Generated ${componentName} ---`);
  console.log(JSON.stringify(result, null, 2));
}

const componentIdx = process.argv.indexOf("--component");
const component = componentIdx !== -1 ? process.argv[componentIdx + 1] : null;

if (!component) {
  console.log("Available components:");
  Object.keys(prompts).forEach((name) => console.log(`  --component ${name}`));
  console.log("\nUsage: V0_API_KEY=xxx npx tsx scripts/v0-generate.ts --component <name>");
  process.exit(0);
}

if (!prompts[component]) {
  console.error(`Unknown component: ${component}`);
  console.error(`Available: ${Object.keys(prompts).join(", ")}`);
  process.exit(1);
}

generateComponent(component, prompts[component]).catch((err) => {
  console.error("v0 generation failed:", err);
  process.exit(1);
});
