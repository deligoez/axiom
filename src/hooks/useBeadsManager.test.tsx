import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import { useBeadsStore } from '../stores/beadsStore.js';
import type { Bead } from '../types/bead.js';

// Simple test component that simulates useBeadsManager behavior
function TestBeadsComponent({
  initialBeads = [],
  onMount,
}: {
  initialBeads?: Bead[];
  onMount?: () => void;
}) {
  const beads = useBeadsStore((state) => state.beads);
  const setBeads = useBeadsStore((state) => state.setBeads);

  useEffect(() => {
    setBeads(initialBeads);
    onMount?.();
  }, [initialBeads, setBeads, onMount]);

  return (
    <Box>
      <Text>Beads: {beads.length}</Text>
    </Box>
  );
}

const createTestBead = (overrides: Partial<Bead> = {}): Bead => ({
  id: 'bd-test',
  title: 'Test Task',
  status: 'open',
  priority: 2,
  type: 'task',
  created: '2026-01-09T10:00:00Z',
  updated: '2026-01-09T10:00:00Z',
  ...overrides,
});

describe('useBeadsManager integration', () => {
  beforeEach(() => {
    useBeadsStore.setState({
      beads: [],
      selectedBeadId: null,
      isLoading: false,
      error: null,
    });
  });

  it('loads beads into store on mount', () => {
    const mockBeads = [
      createTestBead({ id: 'bd-1', title: 'Task 1' }),
      createTestBead({ id: 'bd-2', title: 'Task 2' }),
    ];

    render(<TestBeadsComponent initialBeads={mockBeads} />);

    expect(useBeadsStore.getState().beads).toHaveLength(2);
    expect(useBeadsStore.getState().beads[0].id).toBe('bd-1');
  });

  it('updates store when beads change', async () => {
    const { rerender } = render(<TestBeadsComponent initialBeads={[]} />);

    expect(useBeadsStore.getState().beads).toHaveLength(0);

    const newBeads = [createTestBead({ id: 'bd-new' })];
    rerender(<TestBeadsComponent initialBeads={newBeads} />);

    await vi.waitFor(() => {
      expect(useBeadsStore.getState().beads).toHaveLength(1);
    });
  });

  it('renders bead count correctly', () => {
    const mockBeads = [
      createTestBead({ id: 'bd-1' }),
      createTestBead({ id: 'bd-2' }),
      createTestBead({ id: 'bd-3' }),
    ];

    const { lastFrame } = render(<TestBeadsComponent initialBeads={mockBeads} />);

    expect(lastFrame()).toContain('Beads: 3');
  });
});
