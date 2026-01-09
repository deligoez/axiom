import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BeadsService } from './BeadsService.js';
import * as fs from 'fs';
import * as path from 'path';
import type { Bead } from '../types/bead.js';

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

// Mock chokidar
const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => mockWatcher),
  },
  watch: vi.fn(() => mockWatcher),
}));

describe('BeadsService', () => {
  let service: BeadsService;
  const testDir = '/test/project';
  const beadsPath = '/test/project/.beads/issues.jsonl';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BeadsService(testDir);
  });

  afterEach(async () => {
    await service.stop();
  });

  describe('constructor', () => {
    it('initializes with correct beads path', () => {
      expect(service.getBeadsPath()).toBe(beadsPath);
    });
  });

  describe('getBeads', () => {
    it('returns empty array when .beads directory does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(service.getBeads()).toEqual([]);
    });

    it('returns parsed beads when file exists', () => {
      const jsonl = '{"id":"bd-a1b2","title":"Test","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(jsonl);

      const beads = service.getBeads();
      expect(beads).toHaveLength(1);
      expect(beads[0].id).toBe('bd-a1b2');
    });

    it('handles read errors gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });

      expect(service.getBeads()).toEqual([]);
    });
  });

  describe('getBead', () => {
    it('returns bead by id', () => {
      const jsonl = '{"id":"bd-a1b2","title":"Test","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(jsonl);

      const bead = service.getBead('bd-a1b2');
      expect(bead).not.toBeNull();
      expect(bead!.title).toBe('Test');
    });

    it('returns undefined for non-existent id', () => {
      const jsonl = '{"id":"bd-a1b2","title":"Test","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(jsonl);

      expect(service.getBead('bd-notfound')).toBeUndefined();
    });
  });

  describe('events', () => {
    it('emits change event when file changes', async () => {
      const changeHandler = vi.fn();
      service.on('change', changeHandler);

      const jsonl = '{"id":"bd-a1b2","title":"Test","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(jsonl);

      // Simulate file change
      service.reload();

      expect(changeHandler).toHaveBeenCalledWith(expect.any(Array));
    });

    it('emits change with empty array on read failure (graceful degradation)', async () => {
      const changeHandler = vi.fn();
      service.on('change', changeHandler);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });

      service.reload();

      expect(changeHandler).toHaveBeenCalledWith([]);
    });
  });

  describe('watch', () => {
    it('starts watching beads file', async () => {
      const chokidar = await import('chokidar');
      service.watch();

      expect(chokidar.default.watch).toHaveBeenCalledWith(
        beadsPath,
        expect.objectContaining({
          persistent: true,
          ignoreInitial: true,
        })
      );
    });

    it('does not start multiple watchers', async () => {
      const chokidar = await import('chokidar');
      vi.mocked(chokidar.default.watch).mockClear();

      service.watch();
      service.watch();

      // Second call should not create another watcher
      expect(chokidar.default.watch).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('stops the file watcher', async () => {
      service.watch();
      await service.stop();

      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  describe('filtering', () => {
    it('getBeadsByStatus returns beads with specific status', () => {
      const jsonl = `{"id":"bd-a1b2","title":"Open","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}
{"id":"bd-c3d4","title":"In Progress","status":"in_progress","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}`;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(jsonl);

      const openBeads = service.getBeadsByStatus('open');
      expect(openBeads).toHaveLength(1);
      expect(openBeads[0].title).toBe('Open');
    });

    it('getBeadsByPriority returns beads sorted by priority', () => {
      const jsonl = `{"id":"bd-a1b2","title":"Low","status":"open","priority":4,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}
{"id":"bd-c3d4","title":"High","status":"open","priority":1,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}`;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(jsonl);

      const sorted = service.getBeadsSortedByPriority();
      expect(sorted[0].title).toBe('High');
      expect(sorted[1].title).toBe('Low');
    });
  });
});
