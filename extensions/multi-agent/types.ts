/**
 * Multi-Agent System Types
 * Pi-compatible multi-agent orchestrator extension
 */

export interface AgentDefinition {
  name: string;
  description: string;
  systemPromptPath: string;
  allowedTools?: string[];
  model?: string;
  thinkingLevel?: string;
}

export interface AgentRegistry {
  agents: Map<string, AgentDefinition>;
  get(name: string): AgentDefinition | undefined;
  list(): AgentDefinition[];
  register(def: AgentDefinition): void;
}

export interface AgentTask {
  agentName: string;
  task: string;
  dependencies?: string[];
}

export interface AgentPlan {
  tasks: AgentTask[];
  summary: string;
}

export interface AgentRunResult {
  agentName: string;
  task: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  success: boolean;
}

export interface PlanExecutionResult {
  results: AgentRunResult[];
  summary: string;
}
