# F26: Conflict Classifier

**Milestone:** 5 - Merge Service
**Dependencies:** F25 (Merge Worker)
**Estimated Tests:** 11

---

## What It Does

Analyzes merge conflicts and classifies them by complexity. Determines which resolution strategy to use (auto-resolve, rebase, agent, or human).

---

## Why It's Needed

- Not all conflicts are equal - some are trivial
- Guides resolution strategy selection
- Prevents wasting agent time on simple conflicts
- Prevents wasting human time on resolvable conflicts

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/ConflictClassifier.ts` | Classification logic |
| `tests/services/ConflictClassifier.test.ts` | Unit tests |

---

## Conflict Types

| Type | Description | Resolution |
|------|-------------|------------|
| `trivial` | Whitespace, imports, formatting | Auto-resolve (F27) |
| `simple` | Same file, different sections | Rebase-retry (F28) |
| `complex` | Overlapping changes | Resolver Agent (F29) |
| `semantic` | Logic conflicts, breaking changes | Human (F30) |

---

## ConflictClassifier API

```typescript
// src/services/ConflictClassifier.ts

export type ConflictType = 'trivial' | 'simple' | 'complex' | 'semantic';

export interface ConflictAnalysis {
  type: ConflictType;
  files: ConflictFile[];
  confidence: number;  // 0-1, how confident in classification
  suggestedStrategy: 'auto' | 'rebase' | 'agent' | 'human';
}

export interface ConflictFile {
  path: string;
  conflictType: ConflictType;
  markers: ConflictMarker[];
}

export interface ConflictMarker {
  startLine: number;
  endLine: number;
  oursContent: string;
  theirsContent: string;
}

export class ConflictClassifier {
  /**
   * Analyze conflicts in given files
   */
  async analyze(conflictFiles: string[]): Promise<ConflictAnalysis>;

  /**
   * Classify a single file's conflicts
   */
  classifyFile(content: string): ConflictFile;

  /**
   * Get overall conflict type (worst case)
   */
  getOverallType(files: ConflictFile[]): ConflictType;

  /**
   * Determine suggested resolution strategy
   */
  getSuggestedStrategy(analysis: ConflictAnalysis): 'auto' | 'rebase' | 'agent' | 'human';

  /**
   * Check if conflict is likely auto-resolvable
   */
  isAutoResolvable(analysis: ConflictAnalysis): boolean;
}
```

---

## Classification Rules

```typescript
// Trivial: whitespace-only or import ordering
function isTrivial(marker: ConflictMarker): boolean {
  const oursNorm = normalize(marker.oursContent);
  const theirsNorm = normalize(marker.theirsContent);
  return oursNorm === theirsNorm;  // Same after normalization
}

// Simple: different sections of same file
function isSimple(markers: ConflictMarker[]): boolean {
  return markers.length === 1 && markers[0].endLine - markers[0].startLine < 10;
}

// Complex: multiple overlapping regions
function isComplex(markers: ConflictMarker[]): boolean {
  return markers.length > 1 || hasOverlap(markers);
}

// Semantic: requires understanding code meaning
function isSemantic(content: string): boolean {
  return hasBreakingChange(content) || hasLogicConflict(content);
}
```

---

## Test Cases

```typescript
// tests/services/ConflictClassifier.test.ts

describe('ConflictClassifier', () => {
  describe('classifyFile', () => {
    it('should classify whitespace-only as trivial');
    it('should classify import reordering as trivial');
    it('should classify single-region as simple');
    it('should classify multi-region as complex');
    it('should classify breaking changes as semantic');
  });

  describe('analyze', () => {
    it('should analyze multiple files');
    it('should return worst-case type');
  });

  describe('getSuggestedStrategy', () => {
    it('should suggest auto for trivial');
    it('should suggest rebase for simple');
    it('should suggest agent for complex');
    it('should suggest human for semantic');
  });
});
```

---

## Acceptance Criteria

### classifyFile() - 5 tests
- [ ] Whitespace-only conflicts classified as `trivial`
- [ ] Import reordering classified as `trivial`
- [ ] Single-region, small conflict classified as `simple`
- [ ] Multi-region conflicts classified as `complex`
- [ ] Breaking changes classified as `semantic`

### analyze() - 2 tests
- [ ] Analyzes all given conflict files
- [ ] Returns overall type as worst-case (semantic > complex > simple > trivial)

### getSuggestedStrategy() - 4 tests
- [ ] Returns 'auto' for trivial with high confidence
- [ ] Returns 'rebase' for simple
- [ ] Returns 'agent' for complex
- [ ] Returns 'human' for semantic

### Implicit (no dedicated tests)
- `getOverallType()` - tested via analyze() worst-case test
- `isAutoResolvable()` - returns true when type=trivial && confidence>0.8

**Total: 11 tests**

---

## Implementation Notes

1. Parse git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
2. Normalization: strip whitespace, sort imports
3. Conservative classification - when unsure, escalate
4. Confidence score based on pattern matching certainty
5. Breaking change detection: looks for function signature changes, type changes
