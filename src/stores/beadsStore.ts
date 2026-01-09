import { create } from 'zustand';
import type { Bead, BeadStatus } from '../types/bead.js';

export interface BeadsStore {
  beads: Bead[];
  selectedBeadId: string | null;
  isLoading: boolean;
  error: Error | null;

  setBeads: (beads: Bead[]) => void;
  updateBead: (id: string, updates: Partial<Bead>) => void;
  selectBead: (id: string | null) => void;
  getSelectedBead: () => Bead | undefined;
  getBeadsByStatus: (status: BeadStatus) => Bead[];
  getBeadsSortedByPriority: () => Bead[];
  getActiveBeads: () => Bead[];
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
}

export const useBeadsStore = create<BeadsStore>((set, get) => ({
  beads: [],
  selectedBeadId: null,
  isLoading: false,
  error: null,

  setBeads: (beads) =>
    set((state) => {
      // Clear selection if selected bead is no longer in the list
      const selectedStillExists = beads.some((b) => b.id === state.selectedBeadId);
      return {
        beads,
        selectedBeadId: selectedStillExists ? state.selectedBeadId : null,
      };
    }),

  updateBead: (id, updates) =>
    set((state) => ({
      beads: state.beads.map((bead) =>
        bead.id === id ? { ...bead, ...updates } : bead
      ),
    })),

  selectBead: (id) => set({ selectedBeadId: id }),

  getSelectedBead: () => {
    const state = get();
    return state.beads.find((bead) => bead.id === state.selectedBeadId);
  },

  getBeadsByStatus: (status) => {
    return get().beads.filter((bead) => bead.status === status);
  },

  getBeadsSortedByPriority: () => {
    return [...get().beads].sort((a, b) => a.priority - b.priority);
  },

  getActiveBeads: () => {
    return get().beads.filter((bead) => bead.status !== 'closed');
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
