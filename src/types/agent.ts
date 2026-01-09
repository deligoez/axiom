export type AgentStatus = 'idle' | 'running' | 'stopped' | 'error';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  output: string[];
  createdAt: Date;
  config?: AgentConfig;
  pid?: number;
  exitCode?: number;
}

export interface AgentConfig {
  id?: string;  // Optional: use bead ID if spawning for a task
  name: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

let idCounter = 0;

export function createAgent(config: AgentConfig): Agent {
  return {
    id: config.id ?? `agent-${++idCounter}`,
    name: config.name,
    status: 'idle',
    output: [],
    createdAt: new Date(),
    config,
  };
}
