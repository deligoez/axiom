import { create } from 'zustand';
import type { Agent } from '../types/agent.js';

export interface AgentStore {
  agents: Agent[];
  selectedAgentId: string | null;

  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  appendOutput: (id: string, line: string) => void;
  selectAgent: (id: string | null) => void;
  getSelectedAgent: () => Agent | undefined;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  selectedAgentId: null,

  addAgent: (agent) =>
    set((state) => ({
      agents: [...state.agents, agent],
    })),

  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, ...updates } : agent
      ),
    })),

  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((agent) => agent.id !== id),
      selectedAgentId:
        state.selectedAgentId === id ? null : state.selectedAgentId,
    })),

  appendOutput: (id, line) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id
          ? { ...agent, output: [...agent.output, line] }
          : agent
      ),
    })),

  selectAgent: (id) =>
    set({ selectedAgentId: id }),

  getSelectedAgent: () => {
    const state = get();
    return state.agents.find((agent) => agent.id === state.selectedAgentId);
  },
}));
