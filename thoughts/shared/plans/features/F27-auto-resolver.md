# F27: Auto-Resolver

**Milestone:** 5 - Merge Service
**Dependencies:** F26 (Conflict Classifier)
**Estimated Tests:** 6

---

## What It Does

Automatically resolves trivial merge conflicts (whitespace, import ordering, formatting) without human or agent intervention.

---

## Why It's Needed

- Saves time on simple conflicts
- Reduces interruptions for humans/agents
- Handles common git noise (trailing whitespace, import order)
- Fast and deterministic

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/AutoResolver.ts` | Auto-resolution logic |
| `tests/services/AutoResolver.test.ts` | Unit tests |

---

## AutoResolver API

```typescript
// src/services/AutoResolver.ts

export interface AutoResolveResult {
  success: boolean;
  resolved: string[];   // Files successfully resolved
  failed: string[];     // Files that couldn't be auto-resolved
}

export class AutoResolver {
  /**
   * Attempt to auto-resolve trivial conflicts
   */
  async resolve(files: string[]): Promise<AutoResolveResult>;

  /**
   * Resolve whitespace-only conflicts
   */
  resolveWhitespace(content: string): string;

  /**
   * Resolve import ordering conflicts
   */
  resolveImports(content: string): string;

  /**
   * Check if file can be auto-resolved
   */
  canResolve(analysis: ConflictFile): boolean;

  /**
   * Apply resolution and stage file
   */
  async applyResolution(file: string, resolved: string): Promise<void>;
}
```

---

## Resolution Strategies

### Whitespace Resolution
```typescript
// Take "theirs" version with normalized whitespace
function resolveWhitespace(content: string): string {
  // Find conflict markers
  // Compare normalized versions
  // If equal after normalization, take theirs
  // Remove conflict markers
}
```

### Import Resolution
```typescript
// Combine and sort imports
function resolveImports(content: string): string {
  // Extract imports from both versions
  // Merge unique imports
  // Sort alphabetically
  // Replace conflict section
}
```

---

## Test Cases

```typescript
// tests/services/AutoResolver.test.ts

describe('AutoResolver', () => {
  describe('resolveWhitespace', () => {
    it('should resolve trailing whitespace conflicts');
    it('should resolve indentation conflicts');
  });

  describe('resolveImports', () => {
    it('should merge and sort imports');
    it('should remove duplicate imports');
  });

  describe('canResolve', () => {
    it('should return true for trivial conflicts');
    it('should return false for non-trivial conflicts');
  });
});
```

---

## Acceptance Criteria

### resolveWhitespace() - 2 tests
- [ ] Resolves trailing whitespace conflicts
- [ ] Resolves indentation-only conflicts

### resolveImports() - 2 tests
- [ ] Merges imports from both versions
- [ ] Removes duplicate imports and sorts

### canResolve() - 2 tests
- [ ] Returns `true` for `trivial` type conflicts
- [ ] Returns `false` for non-trivial conflicts

### Implicit (no dedicated tests)
- `resolve()` - orchestrates resolveWhitespace/resolveImports based on canResolve
- `applyResolution()` - writes file and runs `git add` (git wrapper)

**Total: 6 tests**

---

## Implementation Notes

1. Only touch files classified as `trivial`
2. Write resolved content and run `git add <file>`
3. After all files resolved, merge can proceed
4. If any file fails, abort and return partial result
5. Never modify files that aren't clearly resolvable
