export type Intent =
  | { type: "fix-all" }
  | { type: "fix-finding"; target: string }
  | { type: "re-audit" }
  | { type: "feedback"; raw: string }
  | { type: "unknown" };
