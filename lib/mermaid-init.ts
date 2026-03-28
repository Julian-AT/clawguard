type MermaidAPI = typeof import("mermaid").default;

let mermaidInstance: MermaidAPI | null = null;

export async function getMermaid(): Promise<MermaidAPI> {
  if (mermaidInstance) return mermaidInstance;
  const mod = await import("mermaid");
  mermaidInstance = mod.default;
  mermaidInstance.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "strict",
    themeVariables: {
      darkMode: true,
      background: "#09090b",
      primaryColor: "#3b82f6",
      primaryTextColor: "#fafafa",
      lineColor: "#a1a1aa",
    },
  });
  return mermaidInstance;
}
