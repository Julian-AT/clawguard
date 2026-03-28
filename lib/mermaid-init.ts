type MermaidAPI = typeof import("mermaid").default;

let mermaidInstance: MermaidAPI | null = null;

export async function getMermaid(): Promise<MermaidAPI> {
  if (mermaidInstance) return mermaidInstance;
  const mod = await import("mermaid");
  mermaidInstance = mod.default;
  /* Matches app `.dark` tokens: --secondary (node/canvas), --foreground (labels), borders/lines readable on secondary */
  const secondary = "#3f3f46";
  const foreground = "#fafafa";
  const line = "#a1a1aa";

  mermaidInstance.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "strict",
    themeVariables: {
      darkMode: true,
      background: secondary,
      mainBkg: secondary,
      secondaryBkg: secondary,
      tertiaryColor: secondary,
      primaryColor: secondary,
      primaryTextColor: foreground,
      secondaryColor: secondary,
      secondaryTextColor: foreground,
      tertiaryTextColor: foreground,
      textColor: foreground,
      lineColor: line,
      border1: line,
      border2: line,
      clusterBkg: secondary,
      clusterBorder: line,
      titleColor: foreground,
      edgeLabelBackground: secondary,
      nodeTextColor: foreground,
    },
  });
  return mermaidInstance;
}
