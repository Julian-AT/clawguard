import type { AgentMemory } from "./types";
import type { Finding } from "@/lib/analysis/types";

export class PipelineMemory implements AgentMemory {
  private store = new Map<string, unknown>();
  private findings = new Map<string, Finding[]>();

  get<T = unknown>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  getFindings(agentName: string): Finding[] {
    return this.findings.get(agentName) ?? [];
  }

  addFindings(agentName: string, findings: Finding[]): void {
    const existing = this.findings.get(agentName) ?? [];
    this.findings.set(agentName, [...existing, ...findings]);
  }

  getAllFindings(): Finding[] {
    return [...this.findings.values()].flat();
  }
}
