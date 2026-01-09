import { useRef, useEffect, useCallback } from 'react';
import { BeadsService } from '../services/BeadsService.js';
import { useBeadsStore } from '../stores/beadsStore.js';
import type { Bead } from '../types/bead.js';

interface UseBeadsManagerReturn {
  reload: () => void;
}

export function useBeadsManager(projectDir: string): UseBeadsManagerReturn {
  const serviceRef = useRef<BeadsService | null>(null);
  const setBeads = useBeadsStore((state) => state.setBeads);
  const setLoading = useBeadsStore((state) => state.setLoading);
  const setError = useBeadsStore((state) => state.setError);

  // Initialize service once
  if (!serviceRef.current) {
    serviceRef.current = new BeadsService(projectDir);
  }

  const service = serviceRef.current;

  // Setup event listeners and load initial data
  useEffect(() => {
    const handleChange = (beads: Bead[]) => {
      setBeads(beads);
      setLoading(false);
    };

    const handleError = (error: Error) => {
      setError(error);
      setLoading(false);
    };

    service.on('change', handleChange);
    service.on('error', handleError);

    // Load initial beads
    setLoading(true);
    const initialBeads = service.getBeads();
    setBeads(initialBeads);
    setLoading(false);

    // Start watching for changes
    service.watch();

    return () => {
      service.off('change', handleChange);
      service.off('error', handleError);
      service.stop();
    };
  }, [service, setBeads, setLoading, setError]);

  const reload = useCallback(() => {
    service.reload();
  }, [service]);

  return { reload };
}
