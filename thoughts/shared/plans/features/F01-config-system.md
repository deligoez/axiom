# F01: Config System

**Milestone:** 1 - Infrastructure
**Dependencies:** None
**Estimated Tests:** 8

---

## What It Does

Reads and writes `.chorus/config.json` - the persistent configuration file for Chorus settings.

---

## Why It's Needed

- Store user preferences (mode, maxParallel, etc.)
- Store project settings (testCommand, buildCommand)
- Store agent configurations (available agents, default agent)
- Required by: F03 (Init), F10 (Test Runner), F22 (Slot Manager)

---

## Config Schema

```typescript
// src/types/config.ts

export interface ChorusConfig {
  version: string;  // Schema version, e.g., "2.0"

  mode: 'semi-auto' | 'autopilot';

  agents: {
    default: string;  // "claude" | "codex" | "opencode"
    maxParallel: number;
    available: {
      [name: string]: AgentConfig;
    };
  };

  project: {
    testCommand: string;
    buildCommand?: string;
  };

  completion: {
    signal: string;  // "<chorus>COMPLETE</chorus>"
    requireTests: boolean;
    maxIterations: number;
    taskTimeout: number;  // ms
  };

  merge: {
    autoResolve: boolean;
    agentResolve: boolean;
    requireApproval: boolean;
  };

  tui: {
    agentGrid: 'auto' | string;  // "auto" or "2x2", "2x3", etc.
  };
}

export interface AgentConfig {
  command: string;
  args: string[];
  model?: string;
  allowModelOverride?: boolean;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/config.ts` | Type definitions |
| `src/services/ConfigService.ts` | Load/save/validate config |
| `tests/services/ConfigService.test.ts` | Unit tests |

---

## ConfigService API

```typescript
// src/services/ConfigService.ts

export class ConfigService {
  private configPath: string;
  private config: ChorusConfig | null = null;

  constructor(projectDir: string);

  // Load config from .chorus/config.json
  // Returns default config if file doesn't exist
  load(): ChorusConfig;

  // Save config to file
  save(config: ChorusConfig): void;

  // Get current config (load if not cached)
  get(): ChorusConfig;

  // Update specific fields
  update(partial: Partial<ChorusConfig>): void;

  // Check if config file exists
  exists(): boolean;

  // Validate config against schema
  validate(config: unknown): config is ChorusConfig;

  // Get default config
  static getDefaults(): ChorusConfig;
}
```

---

## Default Config

```typescript
static getDefaults(): ChorusConfig {
  return {
    version: '2.0',
    mode: 'semi-auto',
    agents: {
      default: 'claude',
      maxParallel: 3,
      available: {
        claude: {
          command: 'claude',
          args: ['--dangerously-skip-permissions'],
          model: 'sonnet',
          allowModelOverride: true
        }
      }
    },
    project: {
      testCommand: 'npm test'
    },
    completion: {
      signal: '<chorus>COMPLETE</chorus>',
      requireTests: true,
      maxIterations: 50,
      taskTimeout: 1800000  // 30 minutes
    },
    merge: {
      autoResolve: true,
      agentResolve: true,
      requireApproval: false
    },
    tui: {
      agentGrid: 'auto'
    }
  };
}
```

---

## Test Cases

```typescript
// tests/services/ConfigService.test.ts

describe('ConfigService', () => {
  describe('load', () => {
    it('should return default config if file does not exist');
    it('should load config from existing file');
    it('should throw on invalid JSON');
  });

  describe('save', () => {
    it('should create .chorus directory if not exists');
    it('should write config to file');
    it('should preserve formatting');
  });

  describe('validate', () => {
    it('should accept valid config');
    it('should reject missing required fields');
    it('should reject invalid mode');
    it('should reject invalid agent config');
  });

  describe('getDefaults', () => {
    it('should return complete default config');
  });
});
```

---

## Acceptance Criteria

- [ ] Can load config from `.chorus/config.json`
- [ ] Returns defaults if file doesn't exist
- [ ] Can save config to file
- [ ] Creates `.chorus/` directory if needed
- [ ] Validates config structure
- [ ] Rejects invalid configs with clear error
- [ ] Caches loaded config for performance
- [ ] All 8 tests pass

---

## Implementation Notes

1. Use `fs.readFileSync` / `fs.writeFileSync` for simplicity (sync is fine for config)
2. Use `JSON.parse` / `JSON.stringify` with 2-space indent
3. Validation can use simple type guards (no need for Zod yet)
4. Config is read-only after load in most cases
