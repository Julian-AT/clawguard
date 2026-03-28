import type { SecurityAgentDefinition } from "./types";

const agents = new Map<string, SecurityAgentDefinition>();

export function registerAgent(agent: SecurityAgentDefinition): void {
  agents.set(agent.name, agent);
}

export function getAgent(name: string): SecurityAgentDefinition | undefined {
  return agents.get(name);
}

export function getAllAgents(): SecurityAgentDefinition[] {
  return [...agents.values()];
}

export function getAgentsByDependency(): Map<string, string[]> {
  const deps = new Map<string, string[]>();
  for (const agent of agents.values()) {
    deps.set(agent.name, agent.dependsOn);
  }
  return deps;
}
