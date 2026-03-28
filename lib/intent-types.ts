export type Intent =
  | { type: "fix-all" }
  | { type: "fix-finding"; target: string }
  | { type: "re-audit" }
  | { type: "unknown" };
