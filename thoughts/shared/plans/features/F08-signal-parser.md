# F08: Signal Parser

**Milestone:** 2 - Agent Preparation
**Dependencies:** None
**Estimated Tests:** 10

---

## What It Does

Parses `<chorus>` signals from agent output to detect completion, blocking, and other states.

---

## Why It's Needed

- Detect when agent completes task
- Detect when agent is blocked
- Detect progress updates
- Critical for completion detection (F11)

---

## Signal Protocol

```xml
<!-- Completion signals -->
<chorus>COMPLETE</chorus>           <!-- Task finished successfully -->
<chorus>BLOCKED: reason</chorus>    <!-- Cannot proceed, needs help -->
<chorus>NEEDS_HELP: question</chorus> <!-- Needs clarification -->
<chorus>PROGRESS: 45</chorus>       <!-- Progress percentage (0-100) -->

<!-- Merge resolution signals (F29) -->
<chorus>RESOLVED</chorus>           <!-- Conflict resolved -->
<chorus>NEEDS_HUMAN: reason</chorus> <!-- Cannot resolve, need human -->
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/SignalParser.ts` | Parse signals from output |
| `src/types/signal.ts` | Signal types |
| `tests/services/SignalParser.test.ts` | Unit tests |

---

## Signal Types

```typescript
// src/types/signal.ts

export type SignalType =
  | 'COMPLETE'
  | 'BLOCKED'
  | 'NEEDS_HELP'
  | 'PROGRESS'
  | 'RESOLVED'
  | 'NEEDS_HUMAN';

export interface Signal {
  type: SignalType;
  payload: string | null;  // Reason, question, or progress value
  raw: string;             // Original matched string
}

export interface ParseResult {
  signal: Signal | null;
  hasSignal: boolean;
}
```

---

## SignalParser API

```typescript
// src/services/SignalParser.ts

import type { Signal, ParseResult, SignalType } from '../types/signal';

// Regex pattern for signals
const SIGNAL_REGEX = /<chorus>(\w+)(?::\s*(.+?))?<\/chorus>/;
const SIGNAL_REGEX_GLOBAL = /<chorus>(\w+)(?::\s*(.+?))?<\/chorus>/g;

export class SignalParser {
  // Parse first signal from output
  parse(output: string): ParseResult {
    const match = output.match(SIGNAL_REGEX);
    if (!match) {
      return { signal: null, hasSignal: false };
    }

    return {
      signal: {
        type: match[1] as SignalType,
        payload: match[2]?.trim() || null,
        raw: match[0]
      },
      hasSignal: true
    };
  }

  // Parse all signals from output (for multi-signal detection)
  parseAll(output: string): Signal[] {
    const signals: Signal[] = [];
    let match;

    while ((match = SIGNAL_REGEX_GLOBAL.exec(output)) !== null) {
      signals.push({
        type: match[1] as SignalType,
        payload: match[2]?.trim() || null,
        raw: match[0]
      });
    }

    return signals;
  }

  // Check if output contains specific signal type
  hasSignal(output: string, type: SignalType): boolean {
    const result = this.parse(output);
    return result.hasSignal && result.signal?.type === type;
  }

  // Check if output contains COMPLETE signal
  isComplete(output: string): boolean {
    return this.hasSignal(output, 'COMPLETE');
  }

  // Check if output contains BLOCKED signal
  isBlocked(output: string): boolean {
    return this.hasSignal(output, 'BLOCKED');
  }

  // Extract progress percentage
  getProgress(output: string): number | null {
    const result = this.parse(output);
    if (result.signal?.type === 'PROGRESS' && result.signal.payload) {
      const num = parseInt(result.signal.payload, 10);
      return isNaN(num) ? null : Math.min(100, Math.max(0, num));
    }
    return null;
  }

  // Get block/help reason
  getReason(output: string): string | null {
    const result = this.parse(output);
    if (result.signal?.type === 'BLOCKED' || result.signal?.type === 'NEEDS_HELP') {
      return result.signal.payload;
    }
    return null;
  }
}
```

---

## Test Cases

```typescript
// tests/services/SignalParser.test.ts

describe('SignalParser', () => {
  describe('parse', () => {
    it('should parse COMPLETE signal');
    it('should parse BLOCKED signal with reason');
    it('should parse NEEDS_HELP signal with question');
    it('should parse PROGRESS signal with percentage');
    it('should return null for no signal');
    it('should handle signal in middle of output');
  });

  describe('parseAll', () => {
    it('should find multiple signals');
    it('should return empty array for no signals');
  });

  describe('helpers', () => {
    it('isComplete should return true for COMPLETE');
    it('getProgress should parse percentage');
    it('getReason should extract block reason');
  });
});
```

---

## Acceptance Criteria

- [ ] Parses `<chorus>COMPLETE</chorus>`
- [ ] Parses `<chorus>BLOCKED: reason</chorus>`
- [ ] Parses `<chorus>PROGRESS: 45</chorus>`
- [ ] Returns null for no signal
- [ ] Finds signal anywhere in output (not just end)
- [ ] `isComplete()` helper works
- [ ] `isBlocked()` helper works
- [ ] `getProgress()` returns number
- [ ] `getReason()` extracts reason text
- [ ] All 10 tests pass

---

## Implementation Notes

1. Signal can appear anywhere in output (not just last line)
2. Use non-greedy match for payload to avoid grabbing too much
3. Payload is optional (COMPLETE has no payload)
4. Progress is clamped to 0-100
5. Multiple signals possible - parseAll() for conflict resolution
