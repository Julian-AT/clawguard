import type { AgentDefinition } from "./types";

const agents = new Map<string, AgentDefinition>();

export function registerAgent(agent: AgentDefinition): void {
  agents.set(agent.name, agent);
}

export function getAgent(name: string): AgentDefinition | undefined {
  return agents.get(name);
}

export function getAllAgents(): AgentDefinition[] {
  return [...agents.values()];
}

export function getAgentsByDependency(): Map<string, string[]> {
  const deps = new Map<string, string[]>();
  for (const agent of agents.values()) {
    deps.set(agent.name, agent.dependsOn);
  }
  return deps;
}
