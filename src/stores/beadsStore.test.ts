import { describe, it, expect, beforeEach } from 'vitest';
import { useBeadsStore } from './beadsStore.js';
import type { Bead } from '../types/bead.js';

describe('beadsStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useBeadsStore.setState({
      beads: [],
      selectedBeadId: null,
      isLoading: false,
      error: null,
    });
  });

  const createTestBead = (overrides: Partial<Bead> = {}): Bead => ({
    id: 'bd-test',
    title: 'Test Bead',
    status: 'open',
    priority: 2,
    type: 'task',
    created: '2026-01-09T10:00:00Z',
    updated: '2026-01-09T10:00:00Z',
    ...overrides,
  });

  describe('setBeads', () => {
    it('sets all beads', () => {
      const beads = [
        createTestBead({ id: 'bd-1' }),
        createTestBead({ id: 'bd-2' }),
      ];

      useBeadsStore.getState().setBeads(beads);

      expect(useBeadsStore.getState().beads).toHaveLength(2);
      expect(useBeadsStore.getState().beads[0].id).toBe('bd-1');
    });

    it('replaces existing beads', () => {
      useBeadsStore.setState({ beads: [createTestBead({ id: 'bd-old' })] });

      useBeadsStore.getState().setBeads([createTestBead({ id: 'bd-new' })]);

      expect(useBeadsStore.getState().beads).toHaveLength(1);
      expect(useBeadsStore.getState().beads[0].id).toBe('bd-new');
    });
  });

  describe('updateBead', () => {
    it('updates a bead by id', () => {
      const bead = createTestBead({ id: 'bd-1', status: 'open' });
      useBeadsStore.setState({ beads: [bead] });

      useBeadsStore.getState().updateBead('bd-1', { status: 'in_progress' });

      expect(useBeadsStore.getState().beads[0].status).toBe('in_progress');
    });

    it('does not affect other beads', () => {
      const beads = [
        createTestBead({ id: 'bd-1', title: 'First' }),
        createTestBead({ id: 'bd-2', title: 'Second' }),
      ];
      useBeadsStore.setState({ beads });

      useBeadsStore.getState().updateBead('bd-1', { title: 'Updated' });

      expect(useBeadsStore.getState().beads[1].title).toBe('Second');
    });
  });

  describe('selectBead', () => {
    it('selects a bead by id', () => {
      useBeadsStore.getState().selectBead('bd-123');
      expect(useBeadsStore.getState().selectedBeadId).toBe('bd-123');
    });

    it('clears selection with null', () => {
      useBeadsStore.setState({ selectedBeadId: 'bd-123' });
      useBeadsStore.getState().selectBead(null);
      expect(useBeadsStore.getState().selectedBeadId).toBeNull();
    });
  });

  describe('getSelectedBead', () => {
    it('returns selected bead', () => {
      const bead = createTestBead({ id: 'bd-1' });
      useBeadsStore.setState({ beads: [bead], selectedBeadId: 'bd-1' });

      const selected = useBeadsStore.getState().getSelectedBead();

      expect(selected?.id).toBe('bd-1');
    });

    it('returns undefined when no selection', () => {
      useBeadsStore.setState({ beads: [createTestBead()], selectedBeadId: null });

      expect(useBeadsStore.getState().getSelectedBead()).toBeUndefined();
    });

    it('returns undefined when selected id not found', () => {
      useBeadsStore.setState({ beads: [createTestBead()], selectedBeadId: 'bd-notfound' });

      expect(useBeadsStore.getState().getSelectedBead()).toBeUndefined();
    });
  });

  describe('filtering methods', () => {
    const beads = [
      createTestBead({ id: 'bd-1', status: 'open', priority: 2 }),
      createTestBead({ id: 'bd-2', status: 'in_progress', priority: 1 }),
      createTestBead({ id: 'bd-3', status: 'open', priority: 3 }),
      createTestBead({ id: 'bd-4', status: 'closed', priority: 0 }),
    ];

    beforeEach(() => {
      useBeadsStore.setState({ beads });
    });

    it('getBeadsByStatus filters by status', () => {
      const openBeads = useBeadsStore.getState().getBeadsByStatus('open');
      expect(openBeads).toHaveLength(2);
      expect(openBeads.every(b => b.status === 'open')).toBe(true);
    });

    it('getBeadsSortedByPriority sorts by priority (0 = highest)', () => {
      const sorted = useBeadsStore.getState().getBeadsSortedByPriority();
      expect(sorted[0].priority).toBe(0);
      expect(sorted[1].priority).toBe(1);
      expect(sorted[2].priority).toBe(2);
      expect(sorted[3].priority).toBe(3);
    });

    it('getActiveBeads returns non-closed beads', () => {
      const active = useBeadsStore.getState().getActiveBeads();
      expect(active).toHaveLength(3);
      expect(active.every(b => b.status !== 'closed')).toBe(true);
    });
  });

  describe('loading and error states', () => {
    it('setLoading sets loading state', () => {
      useBeadsStore.getState().setLoading(true);
      expect(useBeadsStore.getState().isLoading).toBe(true);

      useBeadsStore.getState().setLoading(false);
      expect(useBeadsStore.getState().isLoading).toBe(false);
    });

    it('setError sets error state', () => {
      const error = new Error('Test error');
      useBeadsStore.getState().setError(error);
      expect(useBeadsStore.getState().error).toBe(error);
    });

    it('setError clears error with null', () => {
      useBeadsStore.setState({ error: new Error('Old error') });
      useBeadsStore.getState().setError(null);
      expect(useBeadsStore.getState().error).toBeNull();
    });
  });
});
