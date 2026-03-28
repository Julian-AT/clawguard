import type { FindingCategory } from "@/lib/analysis/types";

export function categoryLabel(c: FindingCategory): string {
  switch (c) {
    case "security":
      return "Security";
    case "quality":
      return "Quality";
    case "architecture":
      return "Architecture";
    case "testing":
      return "Tests";
    case "documentation":
      return "Docs";
    case "performance":
      return "Performance";
    default:
      return c;
  }
}
